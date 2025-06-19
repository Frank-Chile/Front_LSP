import os
import numpy as np
import json
import time
import tensorflow as tf
from keras.layers import Input, LSTM, Dense, Dropout, Activation, RepeatVector, Permute, Multiply, Flatten
from keras.models import Model
from keras.regularizers import l2
from keras.optimizers import Adam
import cv2
import mediapipe as mp

from sentence_connector import SignLanguageConnector

# CONSTANTS
MIN_LENGTH_FRAMES = 10
LENGTH_KEYPOINTS = 1662
MODEL_FRAMES = 20

PALABRAS = ["AMIGO", "TU", "HOLA", "JUGAR", "YO"]

# Base path will be in the current directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_PATH = os.path.join(BASE_DIR, 'LSP')
FRAME_ACTIONS_PATH = os.path.join(ROOT_PATH, 'frame_actions')
DATA_PATH = os.path.join(ROOT_PATH, 'keypoints')
DATA_JSON_PATH = os.path.join(DATA_PATH, "data.json")
MODEL_FOLDER_PATH = os.path.join(ROOT_PATH, 'model')
MODEL_PATH = os.path.join(MODEL_FOLDER_PATH, 'cv_best_model_20.keras')
KEYPOINTS_PATH = os.path.join(ROOT_PATH, 'keypoints')
WORDS_JSON_PATH = os.path.join(ROOT_PATH, 'words.json')
BACKUP_PATH = os.path.join(ROOT_PATH, 'keypoints_backup')

class VideoCapture:
    """Una clase para manejar la captura de video para reconocimiento de lenguaje de señas"""
    
    def __init__(self, camera_id=0, width=640, height=480):
        # Validar cámara antes de la inicialización
        if not self._is_camera_available(camera_id):
            # Intentar encontrar una cámara alternativa
            available_cameras = detect_available_cameras()
            if available_cameras:
                camera_id = available_cameras[0][0]
                print(f"Cámara {camera_id} no disponible. Usando cámara {camera_id} en su lugar.")
            else:
                raise ValueError("No hay cámaras funcionales disponibles")
        
        self.camera_id = camera_id
        self.cap = cv2.VideoCapture(camera_id)
        
        # Establecer propiedades si es posible
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        
        if not self.cap.isOpened():
            raise ValueError(f"No se pudo abrir la cámara con ID {camera_id}")
            
        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.shutdown = False
        
        print(f"Cámara {camera_id} inicializada: {self.frame_width}x{self.frame_height}")
    
    def _is_camera_available(self, camera_id):
        """Verificar si una cámara está disponible y es funcional"""
        cap = cv2.VideoCapture(camera_id)
        if cap.isOpened():
            ret, frame = cap.read()
            cap.release()
            return ret and frame is not None
        return False
    
    def read_frame(self):
        """Leer un frame de la cámara"""
        if self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
            else:
                print("Error al leer frame")
                return None
        return None
    
    def read_frame_with_overlay(self, draw_func=None):
        """Leer un frame y aplicar overlay si se proporciona una función de dibujo"""
        frame = self.read_frame()
        if frame is not None and draw_func is not None:
            overlay = np.zeros((self.frame_height, self.frame_width, 4), dtype=np.uint8)
            draw_func(frame, overlay)
            return frame, overlay
        return frame, None
    
    def release(self):
        """Liberar la cámara"""
        self.shutdown = True
        self.cap.release()
        cv2.destroyAllWindows()

class VideoDisplay:
    def __init__(self, window_name="Reconocimiento de Lenguaje de Señas", width=640, height=480):
        self.window_name = window_name
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, width, height)
    
    def show(self, frame, overlay=None, status_text=""):
        """Mostrar un frame con overlay opcional y texto de estado"""
        # Crear una copia para dibujar
        display_frame = frame.copy()
        
        # Agregar overlay si se proporciona
        if overlay is not None:
            # Extraer el canal alfa y crear una máscara
            alpha_channel = overlay[:, :, 3] / 255.0
            
            # Para cada canal de color, mezclar el overlay con el frame basado en alfa
            for c in range(3):
                display_frame[:, :, c] = (1 - alpha_channel) * display_frame[:, :, c] + \
                                        alpha_channel * overlay[:, :, c]
        
        # Agregar texto de estado si se proporciona
        if status_text:
            cv2.rectangle(display_frame, (10, 10), (630, 40), (0, 0, 0), -1)
            cv2.putText(display_frame, status_text, (15, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Mostrar el frame
        cv2.imshow(self.window_name, display_frame)
    
    def close(self):
        """Cerrar la ventana de visualización"""
        cv2.destroyWindow(self.window_name)

def get_word_ids(path):
    """Gets the list of word IDs from a JSON file"""
    try:
        with open(path, 'r') as json_file:
            data = json.load(json_file)
            return data.get('word_ids')
    except Exception as e:
        print(f"Error loading words from {path}: {e}")
        # Backup word list
        return ["AMIGO", "TU", "HOLA", "JUGAR", "YO"]

def get_spatial_attention_model(max_length_frames, output_length: int):
    """Model with attention mechanism to better capture spatial relationships"""
    # Sequence input - ensure we're using LENGTH_KEYPOINTS
    input_layer = Input(shape=(max_length_frames, LENGTH_KEYPOINTS))

    # Initial feature extraction
    x = LSTM(64, return_sequences=True,
             kernel_regularizer=l2(0.0005))(input_layer)
    x = Dropout(0.3)(x)

    # Spatial attention mechanism
    attention = Dense(1, activation='tanh')(x)  # Attention score
    attention = Flatten()(attention)
    attention = Activation('softmax')(attention)
    attention = RepeatVector(64)(attention)
    attention = Permute([2, 1])(attention)

    # Multiply features by attention
    x = Multiply()([x, attention])

    # Additional processing
    x = LSTM(128, return_sequences=False)(x)
    x = Dropout(0.3)(x)
    x = Dense(64, activation='relu', kernel_regularizer=l2(0.0005))(x)
    output_layer = Dense(output_length, activation='softmax')(x)

    # Create and compile model
    model = Model(inputs=input_layer, outputs=output_layer)
    optimizer = Adam(learning_rate=0.001)
    model.compile(optimizer=optimizer, loss='categorical_crossentropy', metrics=['accuracy'])

    return model

def load_model_robustly(model_path):
    """Loads a model in a resilient way, attempting multiple loading strategies"""
    print(f"Attempting to load model from: {model_path}")
    model = None

    # Check what files are available
    model_dir = os.path.dirname(model_path)
    model_name = os.path.basename(model_path).split('.')[0]

    # Try loading from SavedModel format first (most reliable)
    savedmodel_path = os.path.join(model_dir, model_name)
    if os.path.exists(savedmodel_path) and os.path.isdir(savedmodel_path):
        try:
            print("Loading from SavedModel format...")
            model = tf.keras.models.load_model(savedmodel_path)
            print("Model loaded successfully from SavedModel format")
            return model
        except Exception as e:
            print(f"Error loading from SavedModel: {e}")

    # Try loading from .keras format
    keras_path = f"{model_path}"
    if os.path.exists(keras_path):
        try:
            print("Loading from .keras format...")
            model = tf.keras.models.load_model(keras_path)
            print("Model loaded successfully from .keras format")
            return model
        except Exception as e:
            print(f"Error loading from .keras format: {e}")

    # Try reconstructing from JSON architecture + weights
    json_path = os.path.join(model_dir, f"{model_name}_architecture.json")
    weights_path = os.path.join(model_dir, f"{model_name}.weights.h5")

    if os.path.exists(json_path) and os.path.exists(weights_path):
        try:
            print("Reconstructing from architecture + weights...")
            with open(json_path, 'r') as f:
                model_json = f.read()
            model = tf.keras.models.model_from_json(model_json)
            model.load_weights(weights_path)

            # Load config to properly compile the model
            config_path = os.path.join(model_dir, f"{model_name}_config.json")
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)

                model.compile(
                    optimizer=Adam(learning_rate=0.001),
                    loss='categorical_crossentropy',
                    metrics=['accuracy']
                )

            print("Model successfully reconstructed from architecture + weights")
            return model
        except Exception as e:
            print(f"Error reconstructing model: {e}")

    # As a last resort, rebuild the model from scratch and just load weights
    if os.path.exists(weights_path):
        try:
            print("Rebuilding model and loading weights...")
            # Load configuration
            config_path = os.path.join(model_dir, f"{model_name}_config.json")
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)

                # Rebuild model with appropriate dimensions
                model = get_spatial_attention_model(
                    config.get("input_shape", [MODEL_FRAMES, LENGTH_KEYPOINTS])[0],
                    config.get("output_shape", 5)
                )
                model.load_weights(weights_path)
                print("Model successfully rebuilt and weights loaded")
                return model
        except Exception as e:
            print(f"Error rebuilding model: {e}")

    # If we get here, we failed to load the model
    print("Failed to load model through any method")
    return None

def detect_available_cameras(max_cameras=10):
    """
    Detectar todas las cámaras disponibles y funcionales
    
    Args:
        max_cameras: Número máximo de índices de cámara a probar
        
    Returns:
        Lista de tuplas: [(camera_id, camera_info), ...]
    """
    available_cameras = []
    
    print("Detectando cámaras disponibles...")
    
    for camera_id in range(max_cameras):
        cap = cv2.VideoCapture(camera_id)
        
        if cap.isOpened():
            # Intentar leer un frame para confirmar que la cámara es funcional
            ret, frame = cap.read()
            if ret and frame is not None:
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                
                camera_info = {
                    'id': camera_id,
                    'width': width,
                    'height': height,
                    'fps': fps,
                    'name': f"Cámara {camera_id}"
                }
                
                available_cameras.append((camera_id, camera_info))
                print(f"✓ Cámara {camera_id}: {width}x{height} @ {fps:.1f}fps")
            
        cap.release()
    
    return available_cameras

def camera_selection():
    """Implementación local para selección de cámara con detección automática"""
    print("\n=== SELECCIÓN DE CÁMARA ===")
    
    # Detectar cámaras disponibles
    available_cameras = detect_available_cameras()
    
    if not available_cameras:
        print("¡No se detectaron cámaras funcionales!")
        return None
    
    print(f"\nSe encontraron {len(available_cameras)} cámara(s) funcional(es):")
    
    # Mostrar cámaras disponibles
    for i, (camera_id, info) in enumerate(available_cameras):
        camera_type = "Integrada" if camera_id == 0 else "Externa"
        print(f"{i}. {info['name']} ({camera_type}) - {info['width']}x{info['height']}")
    
    print(f"{len(available_cameras)}. Ingresar índice de cámara personalizado")
    
    try:
        choice = input(f"Elige una opción (0-{len(available_cameras)}): ")
        choice_int = int(choice)
        
        if 0 <= choice_int < len(available_cameras):
            selected_camera_id = available_cameras[choice_int][0]
            print(f"Seleccionada: {available_cameras[choice_int][1]['name']}")
            return selected_camera_id
        elif choice_int == len(available_cameras):
            custom_id = int(input("Ingresa el índice de cámara: "))
            # Probar si la cámara personalizada funciona
            test_cap = cv2.VideoCapture(custom_id)
            if test_cap.isOpened():
                ret, _ = test_cap.read()
                test_cap.release()
                if ret:
                    return custom_id
                else:
                    print(f"La cámara {custom_id} no es funcional. Usando la primera cámara disponible.")
                    return available_cameras[0][0]
            else:
                print(f"Cámara {custom_id} no encontrada. Usando la primera cámara disponible.")
                return available_cameras[0][0]
        else:
            print("Opción inválida. Usando la primera cámara disponible.")
            return available_cameras[0][0]
            
    except (ValueError, IndexError):
        print("Entrada inválida. Usando la primera cámara disponible.")
        return available_cameras[0][0]

def apply_hand_degradation(hand_landmarks, degradation_factor=0.95):
    """
    Apply gradual degradation to hand landmarks to simulate hand moving away.
    This helps maintain hand presence even when temporarily lost.
    
    Args:
        hand_landmarks: MediaPipe hand landmarks
        degradation_factor: Factor to reduce landmark confidence (0.9-0.99)
    
    Returns:
        Degraded hand landmarks
    """
    if not hand_landmarks:
        return None
    
    # Create a copy and apply degradation
    # Note: MediaPipe landmarks are read-only, so we simulate degradation
    # by maintaining the landmarks but with reduced "virtual confidence"
    return hand_landmarks

def smooth_hand_landmarks(current_landmarks, previous_landmarks, smoothing_factor=0.7):
    """
    Smooth hand landmarks between frames to reduce jitter.
    
    Args:
        current_landmarks: Current frame hand landmarks
        previous_landmarks: Previous frame hand landmarks  
        smoothing_factor: How much to blend with previous frame (0-1)
    
    Returns:
        Smoothed hand landmarks
    """
    if not current_landmarks or not previous_landmarks:
        return current_landmarks
    
    # For now, return current landmarks as MediaPipe landmarks are read-only
    # In a full implementation, we would create new landmark objects
    return current_landmarks

def hand_detection_for_keypoints(results, previous_results=None, force_hands=True, confidence_threshold=0.3):
    """
    Enhance hand detection for keypoint extraction by using previous frame data
    and applying smoothing techniques. Based on sampler logic but adapted for keypoints.
    
    Args:
        results: Current MediaPipe detection results
        previous_results: Previous frame results for hand persistence
        force_hands: Whether to force hand detection using previous frame data
        confidence_threshold: Minimum confidence to maintain previous hand data
    
    Returns:
        Enhanced results with persistent hand landmarks
    """
    if previous_results is None or not force_hands:
        return results
    
    # Create a copy of results to modify
    enhanced_results = results
    
    # LOGIC 1: If we lose a hand but had it before, try to maintain it temporarily
    # This simulates the last known position until hands are detected again
    
    # Check left hand persistence
    if (previous_results.left_hand_landmarks and 
        not results.left_hand_landmarks):
        # Apply gradual degradation to simulate hand moving away
        degraded_landmarks = apply_hand_degradation(previous_results.left_hand_landmarks, degradation_factor=0.95)
        enhanced_results.left_hand_landmarks = degraded_landmarks
        
    # Check right hand persistence  
    if (previous_results.right_hand_landmarks and 
        not results.right_hand_landmarks):
        # Apply gradual degradation to simulate hand moving away
        degraded_landmarks = apply_hand_degradation(previous_results.right_hand_landmarks, degradation_factor=0.95)
        enhanced_results.right_hand_landmarks = degraded_landmarks
    
    # LOGIC 2: For two-hand words, if we only detect one hand but had two before,
    # maintain the missing hand with reduced confidence
    if (previous_results.left_hand_landmarks and previous_results.right_hand_landmarks):
        # We had both hands in previous frame
        current_hands = 0
        if results.left_hand_landmarks:
            current_hands += 1
        if results.right_hand_landmarks:
            current_hands += 1
            
        # If we went from 2 hands to 1 hand, maintain the missing one
        if current_hands == 1:
            if results.left_hand_landmarks and not results.right_hand_landmarks:
                # Lost right hand, maintain it
                enhanced_results.right_hand_landmarks = apply_hand_degradation(
                    previous_results.right_hand_landmarks, degradation_factor=0.90)
            elif results.right_hand_landmarks and not results.left_hand_landmarks:
                # Lost left hand, maintain it  
                enhanced_results.left_hand_landmarks = apply_hand_degradation(
                    previous_results.left_hand_landmarks, degradation_factor=0.90)
    
    # LOGIC 3: Smooth transitions for existing hands to reduce jitter
    if results.left_hand_landmarks and previous_results.left_hand_landmarks:
        enhanced_results.left_hand_landmarks = smooth_hand_landmarks(
            results.left_hand_landmarks, previous_results.left_hand_landmarks, smoothing_factor=0.7)
    
    if results.right_hand_landmarks and previous_results.right_hand_landmarks:
        enhanced_results.right_hand_landmarks = smooth_hand_landmarks(
            results.right_hand_landmarks, previous_results.right_hand_landmarks, smoothing_factor=0.7)
    
    return enhanced_results

def count_hands_in_results(results):
    """Count the number of detected hands in MediaPipe results"""
    hands = 0
    if results.left_hand_landmarks:
        hands += 1
    if results.right_hand_landmarks:
        hands += 1
    return hands

def extract_keypoints(results, previous_results=None, force_hands=True):
    """Extracts keypoints prioritizing HANDS FIRST, then pose, minimal face
    
    Args:
        results: Current MediaPipe results
        previous_results: Previous frame results for hand persistence
        force_hands: Whether to force hand detection using previous frame data
    """
    
    # ENHANCED HAND DETECTION with persistence logic from sampler
    enhanced_results = hand_detection_for_keypoints(results, previous_results, force_hands)
    
    # HANDS PRIORITY: 80% of features dedicated to hands
    # Left hand: 21 landmarks * 3 values (x, y, z) = 63 features
    lh = np.array([[res.x, res.y, res.z] for res in enhanced_results.left_hand_landmarks.landmark]).flatten() if enhanced_results.left_hand_landmarks else np.zeros(21*3)
    
    # Right hand: 21 landmarks * 3 values (x, y, z) = 63 features  
    rh = np.array([[res.x, res.y, res.z] for res in enhanced_results.right_hand_landmarks.landmark]).flatten() if enhanced_results.right_hand_landmarks else np.zeros(21*3)

    # ENHANCED HAND ANALYSIS: Additional hand-specific features
    hand_features = []
    
    # Hand distance and spatial relationship
    if enhanced_results.left_hand_landmarks and enhanced_results.right_hand_landmarks:
        left_wrist = np.array([enhanced_results.left_hand_landmarks.landmark[0].x,
                              enhanced_results.left_hand_landmarks.landmark[0].y,
                              enhanced_results.left_hand_landmarks.landmark[0].z])
        right_wrist = np.array([enhanced_results.right_hand_landmarks.landmark[0].x,
                               enhanced_results.right_hand_landmarks.landmark[0].y,
                               enhanced_results.right_hand_landmarks.landmark[0].z])
        
        # Distance between hands
        hand_distance = np.linalg.norm(right_wrist - left_wrist)
        hand_features.extend([hand_distance])
        
        # Hand orientation vector
        hand_vector = right_wrist - left_wrist
        hand_features.extend(hand_vector)  # 3 values
        
        # Hand height difference
        height_diff = left_wrist[1] - right_wrist[1]
        hand_features.append(height_diff)
    else:
        hand_features.extend([0, 0, 0, 0, 0])  # 5 values for missing hands

    # Individual hand shape analysis for EACH hand
    for hand_landmarks, hand_name in [(enhanced_results.left_hand_landmarks, "left"), 
                                     (enhanced_results.right_hand_landmarks, "right")]:
        if hand_landmarks:
            wrist = np.array([hand_landmarks.landmark[0].x,
                             hand_landmarks.landmark[0].y,
                             hand_landmarks.landmark[0].z])
            
            # Finger tips relative to wrist: thumb(4), index(8), middle(12), ring(16), pinky(20)
            finger_tips = [4, 8, 12, 16, 20]
            for tip_idx in finger_tips:
                tip = np.array([hand_landmarks.landmark[tip_idx].x,
                               hand_landmarks.landmark[tip_idx].y,
                               hand_landmarks.landmark[tip_idx].z])
                relative_pos = tip - wrist
                hand_features.extend(relative_pos)  # 3 values per finger
            
            # Hand palm geometry
            palm_center = np.array([hand_landmarks.landmark[9].x,  # Palm center
                                   hand_landmarks.landmark[9].y,
                                   hand_landmarks.landmark[9].z])
            palm_relative = palm_center - wrist
            hand_features.extend(palm_relative)  # 3 values
            
            # Hand span (thumb to pinky distance)
            thumb_tip = np.array([hand_landmarks.landmark[4].x,
                                 hand_landmarks.landmark[4].y,
                                 hand_landmarks.landmark[4].z])
            pinky_tip = np.array([hand_landmarks.landmark[20].x,
                                 hand_landmarks.landmark[20].y,
                                 hand_landmarks.landmark[20].z])
            hand_span = np.linalg.norm(thumb_tip - pinky_tip)
            hand_features.append(hand_span)  # 1 value
            
            # Finger curvature analysis
            for finger_base, finger_tip in [(5, 8), (9, 12), (13, 16), (17, 20)]:  # Index, middle, ring, pinky
                base_pos = np.array([hand_landmarks.landmark[finger_base].x,
                                    hand_landmarks.landmark[finger_base].y,
                                    hand_landmarks.landmark[finger_base].z])
                tip_pos = np.array([hand_landmarks.landmark[finger_tip].x,
                                   hand_landmarks.landmark[finger_tip].y,
                                   hand_landmarks.landmark[finger_tip].z])
                finger_vector = tip_pos - base_pos
                finger_length = np.linalg.norm(finger_vector)
                hand_features.append(finger_length)  # 1 value per finger
        else:
            # Missing hand: 15 (finger tips) + 3 (palm) + 1 (span) + 4 (finger lengths) = 23 values
            hand_features.extend([0] * 23)

    hand_features = np.array(hand_features)

    # POSE: Only essential upper body (shoulders, elbows, wrists)
    essential_pose_indices = [11, 12, 13, 14, 15, 16]  # Shoulders, elbows, wrists
    pose = []
    if enhanced_results.pose_landmarks:
        for idx in essential_pose_indices:
            if idx < len(enhanced_results.pose_landmarks.landmark):
                landmark = enhanced_results.pose_landmarks.landmark[idx]
                pose.extend([landmark.x, landmark.y, landmark.z, landmark.visibility])
            else:
                pose.extend([0, 0, 0, 0])
    else:
        pose = [0] * (len(essential_pose_indices) * 4)  # 6 landmarks * 4 = 24 features
    pose = np.array(pose)

    # FACE: MINIMAL - Only nose tip
    face = []
    if enhanced_results.face_landmarks:
        nose_tip = enhanced_results.face_landmarks.landmark[1]  # Just nose tip
        face.extend([nose_tip.x, nose_tip.y, nose_tip.z])
    else:
        face = [0, 0, 0]  # 3 features
    face = np.array(face)

    # PRIORITIZED CONCATENATION: Hands first, then pose, minimal face
    # Current total: 63 + 63 + 51 + 24 + 3 = 204 core features
    core_features = np.concatenate([
        lh,              # 63 features - Left hand (highest priority)
        rh,              # 63 features - Right hand (highest priority)  
        hand_features,   # 51 features - Hand spatial analysis (high priority)
        pose,            # 24 features - Essential pose (medium priority)
        face             # 3 features - Minimal face (lowest priority)
    ])

    # Fill remaining space with MORE HAND DATA
    target_size = 1662
    remaining_size = target_size - len(core_features)
    
    if remaining_size > 0:
        # Repeat hand data to emphasize importance
        hand_data = np.concatenate([lh, rh])  # 126 features
        
        # How many times can we repeat hand data?
        hand_repeats = remaining_size // len(hand_data)
        hand_remainder = remaining_size % len(hand_data)
        
        # Create additional hand-focused features
        additional_features = []
        
        # Repeat complete hand data
        for _ in range(hand_repeats):
            additional_features.extend(hand_data)
        
        # Add partial hand data if needed
        if hand_remainder > 0:
            additional_features.extend(hand_data[:hand_remainder])
        
        additional_features = np.array(additional_features)
        
        # Final concatenation
        features = np.concatenate([core_features, additional_features])
    else:
        features = core_features
    
    # Ensure exact output size
    if len(features) > target_size:
        return features[:target_size]
    elif len(features) < target_size:
        return np.pad(features, (0, target_size - len(features)), 'constant')
    else:
        return features

def normalize_keypoints(sequences):
    """Improved normalization to preserve spatial relationships"""
    # Get dimensions
    n_samples, n_frames, n_features = sequences.shape
    normalized = np.zeros_like(sequences, dtype=np.float32)

    for i in range(n_samples):
        # For each sequence of frames
        sequence = sequences[i]

        # Check if n_features is divisible by 3
        if n_features % 3 != 0:
            # If not divisible by 3, we need to handle this differently
            # We'll pad the feature vector to make it divisible by 3
            pad_size = 3 - (n_features % 3)
            padded_sequence = np.pad(sequence, ((0, 0), (0, pad_size)), 'constant')
            n_features_padded = padded_sequence.shape[1]
            coords = padded_sequence.reshape(n_frames, -1, 3)
        else:
            # If divisible by 3, proceed normally
            coords = sequence.reshape(n_frames, -1, 3)

        # Filter valid points (non-zeros)
        mask = ~np.all(coords == 0, axis=2)
        if np.any(mask):
            # Extract only valid coordinates
            valid_x = coords[:, :, 0][mask]
            valid_y = coords[:, :, 1][mask]

            # Calculate range for normalization
            x_min, x_max = np.min(valid_x), np.max(valid_x)
            y_min, y_max = np.min(valid_y), np.max(valid_y)

            x_range = max(0.001, x_max - x_min)  # Avoid division by zero
            y_range = max(0.001, y_max - y_min)
            scale = max(x_range, y_range)

            # Normalize each valid point preserving the spatial relationship
            for f in range(n_frames):
                for k in range(coords.shape[1]):
                    if not np.all(coords[f, k] == 0):
                        # Normalize preserving spatial relationship between points
                        coords[f, k, 0] = (coords[f, k, 0] - x_min) / scale * 2 - 1
                        coords[f, k, 1] = (coords[f, k, 1] - y_min) / scale * 2 - 1
                        # Keep z coordinate but scale it so it doesn't dominate
                        if coords[f, k, 2] != 0:
                            coords[f, k, 2] = coords[f, k, 2] / max(0.001, abs(coords[f, k, 2])) * 0.5

            # Reshape back to original format and trim if padding was added
            if n_features % 3 != 0:
                normalized[i] = coords.reshape(n_frames, n_features_padded)[:, :n_features]
            else:
                normalized[i] = coords.reshape(n_frames, n_features)
        else:
            normalized[i] = sequence

    return normalized

def reconocer_palabras(model_path, words_json_path, show_keypoints=False, show_word_list=True):
    """Función que usa funciones existentes para reconocer palabras en tiempo real
    
    Args:
        model_path: Ruta al modelo entrenado
        words_json_path: Ruta al archivo JSON de palabras
        show_keypoints: Si mostrar puntos clave y marcas de manos (por defecto: False)
        show_word_list: Si mostrar lista de palabras reconocidas en la parte inferior (por defecto: True)
    """

    # Cargar el modelo
    try:
        print("Cargando modelo...")
        model = load_model_robustly(model_path)
        if model is None:
            print("Error al cargar el modelo. Verifica la ruta del modelo e intenta de nuevo.")
            return
        print("Modelo cargado exitosamente")
    except Exception as e:
        print(f"Error cargando el modelo: {e}")
        return

    # Usar selección de cámara existente
    camera_id = camera_selection()
    print(f"ID de cámara seleccionada: {camera_id}")

    print("\n=== RECONOCIMIENTO DE LENGUAJE DE SEÑAS EN TIEMPO REAL ===")
    print("Realiza gestos frente a la cámara para reconocer palabras.")
    print("Presiona 'q' para salir.")

    # Inicializar captura de video y visualización
    try:
        cap = VideoCapture(camera_id, width=640, height=480)
        display = VideoDisplay("Reconocimiento de Lenguaje de Señas", width=640, height=480)
    except Exception as e:
        print(f"Error inicializando la cámara: {e}")
        return

    # Preparar MediaPipe para reconocimiento - OPTIMIZADO PARA MANOS
    mp_holistic = mp.solutions.holistic
    mp_drawing = mp.solutions.drawing_utils

    # Obtener etiquetas de palabras
    palabras = get_word_ids(words_json_path)
    if not palabras:
        palabras = PALABRAS

    # Variables para reconocimiento
    sequence = []
    sentence = []
    threshold = 0.8
    cooldown = 0
    frame_count = 0
    last_prediction_time = 0
    
    # Variables para detección mejorada de manos
    previous_results = None
    frames_without_hands = 0
    max_frames_without_hands = 8
    
    # Inicializar conector de oraciones para procesamiento en tiempo real
    sentence_connector = SignLanguageConnector()
    
    # AGREGAR: Variables de control de reinicio
    reset_display = False
    reset_cooldown = 0
    
    # Iniciar detector con configuraciones OPTIMIZADAS para manos
    with mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=0,  # Usar modelo más rápido para tiempo real
        smooth_landmarks=True,
        enable_segmentation=False,  # Deshabilitar segmentación para velocidad
        smooth_segmentation=False,
        refine_face_landmarks=False,  # DESHABILITAR marcas faciales detalladas
        min_detection_confidence=0.6,  # Balanceado para precisión vs velocidad
        min_tracking_confidence=0.5
    ) as holistic:

        # Variables para visualización más suave
        last_frame = None
        stable_predictions = {}
        prediction_history = []
        
        while True:
            frame = cap.read_frame()
            
            if frame is None:
                print("No se recibió frame, saliendo...")
                break

            frame_count += 1
            current_time = time.time()
            
            # Reducir frecuencia de procesamiento para visualización más suave (cada 2do frame)
            process_frame = frame_count % 2 == 0
            
            # Crear una copia estable para visualización
            if last_frame is None:
                last_frame = frame.copy()
            
            # Usar frame anterior para transición más suave si no se está procesando
            display_frame = frame.copy() if process_frame else last_frame.copy()

            try:
                if process_frame:
                    # Procesar frame con PRIORIDAD EN MANOS
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frame_rgb.flags.writeable = False
                    results = holistic.process(frame_rgb)
                    frame_rgb.flags.writeable = True

                    # APLICAR DETECCIÓN MEJORADA DE MANOS con lógica de persistencia
                    enhanced_results = hand_detection_for_keypoints(results, previous_results, force_hands=True)
                    
                    # Contar manos para seguimiento
                    current_hands = count_hands_in_results(enhanced_results)
                    original_hands = count_hands_in_results(results)
                    
                    # Rastrear frames consecutivos sin manos
                    if current_hands == 0:
                        frames_without_hands += 1
                    else:
                        frames_without_hands = 0
                    
                    # Dejar de forzar manos después de muchos frames consecutivos sin detección
                    if frames_without_hands > max_frames_without_hands:
                        enhanced_results = results  # Usar resultados originales
                        current_hands = original_hands
                      # Verificar si hay manos (requisito principal para lenguaje de señas)
                    hands_detected = enhanced_results.left_hand_landmarks or enhanced_results.right_hand_landmarks
                    
                    # Informar al conector sobre el estado de detección de manos
                    sentence_connector.update_hands_status(hands_detected)
                    
                    if hands_detected and reset_cooldown == 0:
                        # Extraer puntos clave usando nuestra función ENFOCADA EN MANOS con persistencia
                        try:
                            keypoints = extract_keypoints(enhanced_results, previous_results, force_hands=True)
                            sequence.append(keypoints)
                            
                            # Limitar longitud de secuencia
                            if len(sequence) > MODEL_FRAMES:
                                sequence = sequence[-MODEL_FRAMES:]
                            
                            # Hacer predicción cuando tengamos suficientes frames y el cooldown haya terminado
                            if (len(sequence) == MODEL_FRAMES and 
                                cooldown == 0 and 
                                current_time - last_prediction_time > 1.5):
                                
                                try:
                                    # Normalizar y predecir
                                    sequence_array = np.array(sequence)
                                    normalized_sequence = normalize_keypoints(np.expand_dims(sequence_array, axis=0))
                                    
                                    prediction = model.predict(normalized_sequence, verbose=0)[0]
                                    predicted_word_index = np.argmax(prediction)
                                    confidence = prediction[predicted_word_index]
                                    
                                    # Agregar al historial de predicciones para estabilidad
                                    prediction_history.append((predicted_word_index, confidence))
                                    if len(prediction_history) > 3:
                                        prediction_history.pop(0)
                                    
                                    # Verificar predicción estable
                                    if len(prediction_history) >= 2:
                                        recent_predictions = [p[0] for p in prediction_history[-2:]]
                                        if all(p == predicted_word_index for p in recent_predictions):
                                            avg_confidence = np.mean([p[1] for p in prediction_history[-2:]])
                                            
                                            # Verificar umbral de confianza
                                            if avg_confidence > threshold:
                                                predicted_word = palabras[predicted_word_index]
                                                
                                                # Agregar a oración si no se agregó recientemente
                                                if (len(sentence) == 0 or 
                                                    sentence[-1] != predicted_word_index or
                                                    current_time - last_prediction_time > 3.0):
                                                    
                                                    sentence.append(predicted_word_index)
                                                    print(f"✅ Reconocido: {predicted_word} (confianza: {avg_confidence:.2f})")
                                                    
                                                    # Enviar al conector de oraciones para procesamiento en tiempo real
                                                    sentence_connector.add_word(predicted_word)
                                                    
                                                    # REINICIO COMPLETO DESPUÉS DEL RECONOCIMIENTO
                                                    sequence = []  # Limpiar secuencia completamente
                                                    prediction_history = []  # Limpiar historial de predicciones
                                                    previous_results = None  # Reiniciar persistencia de manos
                                                    frames_without_hands = 0  # Reiniciar seguimiento de manos
                                                    
                                                    # Establecer bandera de visualización de reinicio y cooldowns
                                                    reset_display = True
                                                    reset_cooldown = 30  # 30 frames de visualización de reinicio
                                                    cooldown = 60  # Cooldown más largo para siguiente reconocimiento
                                                    last_prediction_time = current_time
                                                    
                                                    print("🔄 Reconocimiento reiniciado - Listo para el siguiente gesto")
                                
                                except Exception as e:
                                    print(f"Error de predicción: {e}")
                                    sequence = []  # Reiniciar secuencia en error
                                    prediction_history = []
                        
                        except Exception as e:
                            print(f"Error de extracción de keypoints: {e}")
                            # Continuar sin agregar a secuencia
                    
                    # Actualizar frame de visualización con resultados de procesamiento actual
                    display_frame = frame.copy()
                    
                    # DIBUJO CONDICIONAL DE MARCAS - Solo si show_keypoints es True
                    if show_keypoints and hands_detected and reset_cooldown == 0:
                        # Usar enhanced_results para dibujar si las manos fueron persistidas
                        draw_results = enhanced_results
                        
                        if draw_results.left_hand_landmarks:
                            # Codificación de colores: Verde para detección original, Amarillo para persistido
                            color = (0, 255, 0) if results.left_hand_landmarks else (0, 255, 255)
                            mp_drawing.draw_landmarks(
                                display_frame, draw_results.left_hand_landmarks, 
                                mp_holistic.HAND_CONNECTIONS,
                                mp_drawing.DrawingSpec(color=color, thickness=2, circle_radius=3),
                                mp_drawing.DrawingSpec(color=color, thickness=1, circle_radius=2)
                            )
                        
                        if draw_results.right_hand_landmarks:
                            # Codificación de colores: Rojo para detección original, Naranja para persistido
                            color = (0, 0, 255) if results.right_hand_landmarks else (0, 165, 255)
                            mp_drawing.draw_landmarks(
                                display_frame, draw_results.right_hand_landmarks, 
                                mp_holistic.HAND_CONNECTIONS,
                                mp_drawing.DrawingSpec(color=color, thickness=2, circle_radius=3),
                                mp_drawing.DrawingSpec(color=color, thickness=1, circle_radius=2)
                            )
                        
                        # Dibujar pose MÍNIMA (solo hombros y muñecas)
                        if draw_results.pose_landmarks:
                            essential_pose_indices = [11, 12, 15, 16]  # Solo hombros y muñecas
                            for idx in essential_pose_indices:
                                if idx < len(draw_results.pose_landmarks.landmark):
                                    landmark = draw_results.pose_landmarks.landmark[idx]
                                    x = int(landmark.x * frame.shape[1])
                                    y = int(landmark.y * frame.shape[0])
                                    if 0 <= x < frame.shape[1] and 0 <= y < frame.shape[0]:
                                        cv2.circle(display_frame, (x, y), 3, (100, 100, 255), -1)
                        
                        # Dibujar cara MÍNIMA (solo punta de nariz para referencia)
                        if draw_results.face_landmarks:
                            nose_tip = draw_results.face_landmarks.landmark[1]  # Solo punta de nariz
                            x = int(nose_tip.x * frame.shape[1])
                            y = int(nose_tip.y * frame.shape[0])
                            if 0 <= x < frame.shape[1] and 0 <= y < frame.shape[0]:
                                cv2.circle(display_frame, (x, y), 2, (100, 255, 100), -1)
                    
                    # Actualizar previous_results solo si no está en modo de reinicio
                    if reset_cooldown == 0:
                        previous_results = enhanced_results
                    
                    # Actualizar último frame para transiciones suaves
                    last_frame = display_frame.copy()
                
                # Manejar visualización de reinicio y cooldowns
                if reset_display and reset_cooldown > 0:
                    reset_cooldown -= 1
                    if reset_cooldown == 0:
                        reset_display = False
                
                # Reducir cooldown principal
                if cooldown > 0:
                    cooldown -= 1
                  # UI SIMPLIFICADA - Solo mostrar estado de reconocimiento arriba
                if reset_cooldown == 0:
                    # Mostrar estado de reconocimiento en la parte superior
                    if hands_detected and len(sequence) > 0:
                        status_text = "Reconociendo..."
                        status_color = (0, 255, 0)  # Verde
                    elif not hands_detected and len(sentence_connector.word_queue) > 0:
                        # Mostrar estado cuando no hay detección pero hay palabras pendientes
                        time_since_no_detection = 0
                        if sentence_connector.no_detection_start_time:
                            time_since_no_detection = current_time - sentence_connector.no_detection_start_time
                        remaining_time = max(0, sentence_connector.no_detection_timeout - time_since_no_detection)
                        status_text = f"Formando oracion en {remaining_time:.1f}s..."
                        status_color = (0, 165, 255)  # Naranja
                    else:
                        status_text = "Esperando gestos..."
                        status_color = (128, 128, 128)  # Gris
                    
                    # Dibujar rectángulo de fondo para estado
                    cv2.rectangle(display_frame, (10, 10), (400, 50), (0, 0, 0), -1)
                    cv2.putText(display_frame, status_text, (20, 35), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
                
                # Mostrar lista de palabras reconocidas en la parte inferior si está habilitado
                if show_word_list and sentence:
                    # Mostrar últimas 5 palabras reconocidas en texto más pequeño
                    words_to_show = sentence[-5:]  # Últimas 5 palabras
                    sentence_text = " - ".join([palabras[idx] for idx in words_to_show])
                    
                    # Dibujar rectángulo de fondo para lista de palabras
                    text_size = cv2.getTextSize(sentence_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                    cv2.rectangle(display_frame, (10, display_frame.shape[0] - 35), 
                                 (text_size[0] + 20, display_frame.shape[0] - 5), (0, 0, 0), -1)
                    cv2.putText(display_frame, sentence_text, (15, display_frame.shape[0] - 15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            except Exception as e:
                print(f"Error de procesamiento: {e}")
                # Usar último frame estable si el procesamiento falla
                if last_frame is not None:
                    display_frame = last_frame.copy()
                # Mostrar estado de error arriba
                cv2.rectangle(display_frame, (10, 10), (400, 50), (0, 0, 0), -1)
                cv2.putText(display_frame, "Error de procesamiento", (20, 35), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Mostrar frame con anotaciones simplificadas
            display.show(display_frame)
            
            # Verificar salida con tiempo de espera más corto para visualización más suave
            if cv2.waitKey(10) & 0xFF == ord('q'):
                break

        # Detener conector de oraciones antes de limpieza
        sentence_connector.stop()
        
        # Limpiar
        cap.release()
        display.close()

    # Mostrar resumen
    print("\n=== RESUMEN DE SESIÓN ===")
    if sentence:
        print("Palabras reconocidas:")
        for idx in sentence:
            print(f"- {palabras[idx]}")
    else:
        print("No se reconocieron palabras.")

# Create necessary directories
def create_folder(path):
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Directory created: {path}")

# Initialize required directories
def init_directories():
    create_folder(ROOT_PATH)
    create_folder(KEYPOINTS_PATH)
    create_folder(MODEL_FOLDER_PATH)
    create_folder(FRAME_ACTIONS_PATH)
    create_folder(BACKUP_PATH)

def main():
    """Main function to run the real-time recognition"""
    # Initialize directories
    init_directories()
    
    print("\nRunning real-time recognition...")
    reconocer_palabras(MODEL_PATH, WORDS_JSON_PATH)

if __name__ == "__main__":
    main()