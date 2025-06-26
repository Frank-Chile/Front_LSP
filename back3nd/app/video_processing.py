# Librerías estándar y del entorno
import os
import sys
import json
import time
import tempfile

# Procesamiento de arrays y visión
import numpy as np # type: ignore
import cv2 # type: ignore
import mediapipe as mp # type: ignore

# FastAPI y WebSocket
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket

# Deep Learning
import tensorflow as tf # type: ignore
from keras.layers import Input, LSTM, Dense, Dropout, Activation, RepeatVector, Permute, Multiply, Flatten # type: ignore
from keras.models import Model # type: ignore
from keras.regularizers import l2 # type: ignore
from keras.optimizers import Adam # type: ignore

# Cargar claves y Groq
import keys
from groq import Groq # type: ignore

EXAMPLE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir, 'predict'))
if EXAMPLE_PATH not in sys.path:
    sys.path.append(EXAMPLE_PATH)
from sentence_connector import SignLanguageConnector # type: ignore

# Configuración de Groq y conector de oraciones
API_KEY = keys.GROQ_KEY_LLAMA
os.environ["GROQ_API_KEY"] = API_KEY
groq_client = Groq(api_key=API_KEY)
sentence_connector = SignLanguageConnector()

# Constantes del modelo (EXACTAS de Predicter.py)
MIN_LENGTH_FRAMES = 10
LENGTH_KEYPOINTS = 1662
MODEL_FRAMES = 20

PALABRAS = ["AMIGO", "TU", "HOLA", "JUGAR", "YO"]

# Configuración de paths
ROOT_PATH = "../../predict"
WORDS_JSON_PATH = os.path.join(ROOT_PATH, 'words.json')
MODEL_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
MODEL_PATH = os.path.join(MODEL_FOLDER_PATH, 'cv_best_model_20.keras')

# Configuración de Groq
API_KEY = keys.GROQ_KEY_LLAMA
os.environ["GROQ_API_KEY"] = API_KEY

router = APIRouter()
from collections import deque

loaded_model = None
palabras_disponibles = PALABRAS

def get_word_ids(json_path):
    """Carga las palabras disponibles desde el archivo words.json"""
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            return data.get('word_ids', PALABRAS)
    except FileNotFoundError:
        print(f"Archivo {json_path} no encontrado, usando palabras por defecto")
        return PALABRAS
    except Exception as e:
        print(f"Error cargando palabras: {e}, usando palabras por defecto")
        return PALABRAS

def get_spatial_attention_model(max_length_frames, output_length: int):
    """Modelo con mecanismo de atención - EXACTO de Predicter.py"""
    input_layer = Input(shape=(max_length_frames, LENGTH_KEYPOINTS))

    x = LSTM(64, return_sequences=True, kernel_regularizer=l2(0.0005))(input_layer)
    x = Dropout(0.3)(x)

    attention = Dense(1, activation='tanh')(x)
    attention = Flatten()(attention)
    attention = Activation('softmax')(attention)
    attention = RepeatVector(64)(attention)
    attention = Permute([2, 1])(attention)

    x = Multiply()([x, attention])

    x = LSTM(128, return_sequences=False)(x)
    x = Dropout(0.3)(x)
    x = Dense(64, activation='relu', kernel_regularizer=l2(0.0005))(x)
    output_layer = Dense(output_length, activation='softmax')(x)

    model = Model(inputs=input_layer, outputs=output_layer)
    optimizer = Adam(learning_rate=0.001)
    model.compile(optimizer=optimizer, loss='categorical_crossentropy', metrics=['accuracy'])

    return model

def load_model_robustly(model_path):
    """Carga el modelo de forma resiliente - EXACTA de Predicter.py"""
    print(f"Attempting to load model from: {model_path}")
    model = None

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

    print("Failed to load model through any method")
    return None

def apply_hand_degradation(hand_landmarks, degradation_factor=0.95):
    """Aplicar degradación gradual a landmarks de manos - EXACTA de Predicter.py"""
    if not hand_landmarks:
        return None
    return hand_landmarks

def smooth_hand_landmarks(current_landmarks, previous_landmarks, smoothing_factor=0.7):
    """Suavizar landmarks de manos - EXACTA de Predicter.py"""
    if not current_landmarks or not previous_landmarks:
        return current_landmarks
    return current_landmarks

def hand_detection_for_keypoints(results, previous_results=None, force_hands=True, confidence_threshold=0.3):
    """Mejorar detección de manos - EXACTA de Predicter.py"""
    if previous_results is None or not force_hands:
        return results
    
    enhanced_results = results
    
    # LÓGICA 1: Si perdemos una mano pero la teníamos antes, intentar mantenerla temporalmente
    if (previous_results.left_hand_landmarks and 
        not results.left_hand_landmarks):
        degraded_landmarks = apply_hand_degradation(previous_results.left_hand_landmarks, degradation_factor=0.95)
        enhanced_results.left_hand_landmarks = degraded_landmarks
        
    if (previous_results.right_hand_landmarks and 
        not results.right_hand_landmarks):
        degraded_landmarks = apply_hand_degradation(previous_results.right_hand_landmarks, degradation_factor=0.95)
        enhanced_results.right_hand_landmarks = degraded_landmarks
    
    # LÓGICA 2: Para palabras con dos manos, si solo detectamos una pero teníamos dos antes
    if (previous_results.left_hand_landmarks and previous_results.right_hand_landmarks):
        current_hands = 0
        if results.left_hand_landmarks:
            current_hands += 1
        if results.right_hand_landmarks:
            current_hands += 1
            
        if current_hands == 1:
            if results.left_hand_landmarks and not results.right_hand_landmarks:
                enhanced_results.right_hand_landmarks = apply_hand_degradation(
                    previous_results.right_hand_landmarks, degradation_factor=0.90)
            elif results.right_hand_landmarks and not results.left_hand_landmarks:
                enhanced_results.left_hand_landmarks = apply_hand_degradation(
                    previous_results.left_hand_landmarks, degradation_factor=0.90)
    
    # LÓGICA 3: Suavizar transiciones para manos existentes para reducir jitter
    if results.left_hand_landmarks and previous_results.left_hand_landmarks:
        enhanced_results.left_hand_landmarks = smooth_hand_landmarks(
            results.left_hand_landmarks, previous_results.left_hand_landmarks, smoothing_factor=0.7)
    
    if results.right_hand_landmarks and previous_results.right_hand_landmarks:
        enhanced_results.right_hand_landmarks = smooth_hand_landmarks(
            results.right_hand_landmarks, previous_results.right_hand_landmarks, smoothing_factor=0.7)
    
    return enhanced_results

def count_hands_in_results(results):
    """Cuenta el número de manos detectadas - EXACTA de Predicter.py"""
    hands = 0
    if results.left_hand_landmarks:
        hands += 1
    if results.right_hand_landmarks:
        hands += 1
    return hands

def extract_keypoints(results, previous_results=None, force_hands=True):
    """Extrae keypoints priorizando MANOS - EXACTA de Predicter.py"""
    
    # DETECCIÓN MEJORADA DE MANOS con lógica de persistencia
    enhanced_results = hand_detection_for_keypoints(results, previous_results, force_hands)
    
    # HANDS PRIORITY: 80% de features dedicados a manos
    lh = np.array([[res.x, res.y, res.z] for res in enhanced_results.left_hand_landmarks.landmark]).flatten() if enhanced_results.left_hand_landmarks else np.zeros(21*3)
    rh = np.array([[res.x, res.y, res.z] for res in enhanced_results.right_hand_landmarks.landmark]).flatten() if enhanced_results.right_hand_landmarks else np.zeros(21*3)

    # ANÁLISIS ESPACIAL DE MANOS MEJORADO
    hand_features = []
    
    # Distancia entre manos y relación espacial
    if enhanced_results.left_hand_landmarks and enhanced_results.right_hand_landmarks:
        left_wrist = np.array([enhanced_results.left_hand_landmarks.landmark[0].x,
                              enhanced_results.left_hand_landmarks.landmark[0].y,
                              enhanced_results.left_hand_landmarks.landmark[0].z])
        right_wrist = np.array([enhanced_results.right_hand_landmarks.landmark[0].x,
                               enhanced_results.right_hand_landmarks.landmark[0].y,
                               enhanced_results.right_hand_landmarks.landmark[0].z])
        
        hand_distance = np.linalg.norm(right_wrist - left_wrist)
        hand_features.extend([hand_distance])
        
        hand_vector = right_wrist - left_wrist
        hand_features.extend(hand_vector)  # 3 valores
        
        height_diff = left_wrist[1] - right_wrist[1]
        hand_features.append(height_diff)
    else:
        hand_features.extend([0, 0, 0, 0, 0])  # 5 valores para manos faltantes

    # Análisis de forma de mano individual para CADA mano
    for hand_landmarks, hand_name in [(enhanced_results.left_hand_landmarks, "left"), 
                                     (enhanced_results.right_hand_landmarks, "right")]:
        if hand_landmarks:
            wrist = np.array([hand_landmarks.landmark[0].x,
                             hand_landmarks.landmark[0].y,
                             hand_landmarks.landmark[0].z])
            
            # Puntas de dedos relativas a muñeca: pulgar(4), índice(8), medio(12), anular(16), meñique(20)
            finger_tips = [4, 8, 12, 16, 20]
            for tip_idx in finger_tips:
                tip = np.array([hand_landmarks.landmark[tip_idx].x,
                               hand_landmarks.landmark[tip_idx].y,
                               hand_landmarks.landmark[tip_idx].z])
                relative_pos = tip - wrist
                hand_features.extend(relative_pos)  # 3 valores por dedo
            
            # Geometría de palma
            palm_center = np.array([hand_landmarks.landmark[9].x,
                                   hand_landmarks.landmark[9].y,
                                   hand_landmarks.landmark[9].z])
            palm_relative = palm_center - wrist
            hand_features.extend(palm_relative)  # 3 valores
            
            # Extensión de mano (distancia pulgar a meñique)
            thumb_tip = np.array([hand_landmarks.landmark[4].x,
                                 hand_landmarks.landmark[4].y,
                                 hand_landmarks.landmark[4].z])
            pinky_tip = np.array([hand_landmarks.landmark[20].x,
                                 hand_landmarks.landmark[20].y,
                                 hand_landmarks.landmark[20].z])
            hand_span = np.linalg.norm(thumb_tip - pinky_tip)
            hand_features.append(hand_span)  # 1 valor
            
            # Análisis de curvatura de dedos
            for finger_base, finger_tip in [(5, 8), (9, 12), (13, 16), (17, 20)]:
                base_pos = np.array([hand_landmarks.landmark[finger_base].x,
                                    hand_landmarks.landmark[finger_base].y,
                                    hand_landmarks.landmark[finger_base].z])
                tip_pos = np.array([hand_landmarks.landmark[finger_tip].x,
                                   hand_landmarks.landmark[finger_tip].y,
                                   hand_landmarks.landmark[finger_tip].z])
                finger_vector = tip_pos - base_pos
                finger_length = np.linalg.norm(finger_vector)
                hand_features.append(finger_length)  # 1 valor por dedo
        else:
            # Mano faltante: 15 (puntas dedos) + 3 (palma) + 1 (extensión) + 4 (longitudes dedos) = 23 valores
            hand_features.extend([0] * 23)

    hand_features = np.array(hand_features)

    # POSE: Solo cuerpo superior esencial (hombros, codos, muñecas)
    essential_pose_indices = [11, 12, 13, 14, 15, 16]
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

    # FACE: MÍNIMO - Solo punta de nariz
    face = []
    if enhanced_results.face_landmarks:
        nose_tip = enhanced_results.face_landmarks.landmark[1]
        face.extend([nose_tip.x, nose_tip.y, nose_tip.z])
    else:
        face = [0, 0, 0]  # 3 features
    face = np.array(face)

    # CONCATENACIÓN PRIORIZADA: Manos primero, luego pose, mínimo face
    core_features = np.concatenate([
        lh,              # 63 features - Mano izquierda (prioridad máxima)
        rh,              # 63 features - Mano derecha (prioridad máxima)  
        hand_features,   # 51 features - Análisis espacial de manos (alta prioridad)
        pose,            # 24 features - Pose esencial (prioridad media)
        face             # 3 features - Face mínimo (prioridad baja)
    ])

    # Llenar espacio restante con MÁS DATOS DE MANOS
    target_size = 1662
    remaining_size = target_size - len(core_features)
    
    if remaining_size > 0:
        hand_data = np.concatenate([lh, rh])  # 126 features
        
        hand_repeats = remaining_size // len(hand_data)
        hand_remainder = remaining_size % len(hand_data)
        
        additional_features = []
        
        for _ in range(hand_repeats):
            additional_features.extend(hand_data)
        
        if hand_remainder > 0:
            additional_features.extend(hand_data[:hand_remainder])
        
        additional_features = np.array(additional_features)
        
        features = np.concatenate([core_features, additional_features])
    else:
        features = core_features
    
    # Asegurar tamaño exacto de salida
    if len(features) > target_size:
        return features[:target_size]
    elif len(features) < target_size:
        return np.pad(features, (0, target_size - len(features)), 'constant')
    else:
        return features

def normalize_keypoints(sequences):
    """Normalización mejorada - EXACTA de Predicter.py"""
    n_samples, n_frames, n_features = sequences.shape
    normalized = np.zeros_like(sequences, dtype=np.float32)

    for i in range(n_samples):
        sequence = sequences[i]

        if n_features % 3 != 0:
            pad_size = 3 - (n_features % 3)
            padded_sequence = np.pad(sequence, ((0, 0), (0, pad_size)), 'constant')
            n_features_padded = padded_sequence.shape[1]
            coords = padded_sequence.reshape(n_frames, -1, 3)
        else:
            coords = sequence.reshape(n_frames, -1, 3)

        mask = ~np.all(coords == 0, axis=2)
        if np.any(mask):
            valid_x = coords[:, :, 0][mask]
            valid_y = coords[:, :, 1][mask]

            x_min, x_max = np.min(valid_x), np.max(valid_x)
            y_min, y_max = np.min(valid_y), np.max(valid_y)

            x_range = max(0.001, x_max - x_min)
            y_range = max(0.001, y_max - y_min)
            scale = max(x_range, y_range)

            for f in range(n_frames):
                for k in range(coords.shape[1]):
                    if not np.all(coords[f, k] == 0):
                        coords[f, k, 0] = (coords[f, k, 0] - x_min) / scale * 2 - 1
                        coords[f, k, 1] = (coords[f, k, 1] - y_min) / scale * 2 - 1
                        if coords[f, k, 2] != 0:
                            coords[f, k, 2] = coords[f, k, 2] / max(0.001, abs(coords[f, k, 2])) * 0.5

            if n_features % 3 != 0:
                normalized[i] = coords.reshape(n_frames, n_features_padded)[:, :n_features]
            else:
                normalized[i] = coords.reshape(n_frames, n_features)
        else:
            normalized[i] = sequence

    return normalized

class VideoProcessor:
    def __init__(self):
        self.mp_holistic = mp.solutions.holistic
        self.mp_drawing = mp.solutions.drawing_utils
        self.sequence = []
        self.threshold = 0.8  # UMBRAL EXACTO de Predicter.py
        self.prediction_history = []
        self.previous_results = None
        self.frames_without_hands = 0
        self.max_frames_without_hands = 8

    def process_video_frame(self, frame):
        """Procesa un frame de video - LÓGICA EXACTA de Predicter.py"""
        try:
            # Configuración OPTIMIZADA para manos del Predicter.py
            with self.mp_holistic.Holistic(
                static_image_mode=False,
                model_complexity=0,  # Usar modelo más rápido para tiempo real
                smooth_landmarks=True,
                enable_segmentation=False,  # Deshabilitar segmentación para velocidad
                smooth_segmentation=False,
                refine_face_landmarks=False,  # DESHABILITAR marcas faciales detalladas
                min_detection_confidence=0.6,  # Balanceado para precisión vs velocidad
                min_tracking_confidence=0.5
            ) as holistic:
                
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_rgb.flags.writeable = False
                results = holistic.process(frame_rgb)
                frame_rgb.flags.writeable = True
                
                # APLICAR DETECCIÓN MEJORADA DE MANOS con lógica de persistencia
                enhanced_results = hand_detection_for_keypoints(results, self.previous_results, force_hands=True)
                
                # Contar manos para seguimiento
                current_hands = count_hands_in_results(enhanced_results)
                original_hands = count_hands_in_results(results)
                
                # Rastrear frames consecutivos sin manos
                if current_hands == 0:
                    self.frames_without_hands += 1
                else:
                    self.frames_without_hands = 0
                
                # Dejar de forzar manos después de muchos frames consecutivos sin detección
                if self.frames_without_hands > self.max_frames_without_hands:
                    enhanced_results = results  # Usar resultados originales
                    current_hands = original_hands
                
                # Verificar si hay manos (requisito principal para lenguaje de señas)
                hands_detected = enhanced_results.left_hand_landmarks or enhanced_results.right_hand_landmarks
                
                # DEBUG: Mostrar estado cada 20 frames
                frame_debug = getattr(self, 'frame_debug_count', 0) + 1
                self.frame_debug_count = frame_debug
                if frame_debug % 20 == 0:
                    print(f"📊 Frame {frame_debug}: Manos detectadas={hands_detected}, Secuencia={len(self.sequence)}")
                
                if hands_detected:
                    try:
                        # Extraer puntos clave usando función ENFOCADA EN MANOS con persistencia
                        keypoints = extract_keypoints(enhanced_results, self.previous_results, force_hands=True)
                        self.sequence.append(keypoints)
                        
                        # Limitar longitud de secuencia
                        if len(self.sequence) > MODEL_FRAMES:
                            self.sequence = self.sequence[-MODEL_FRAMES:]
                        
                        # Hacer predicción cuando tengamos suficientes frames
                        if len(self.sequence) == MODEL_FRAMES and loaded_model is not None:
                            try:
                                # Normalizar y predecir - MISMA LÓGICA QUE Predicter.py
                                sequence_array = np.array(self.sequence)
                                normalized_sequence = normalize_keypoints(np.expand_dims(sequence_array, axis=0))
                                
                                prediction = loaded_model.predict(normalized_sequence, verbose=0)[0]
                                predicted_word_index = np.argmax(prediction)
                                confidence = prediction[predicted_word_index]
                                
                                # Agregar al historial de predicciones para estabilidad - MISMA LÓGICA
                                self.prediction_history.append((predicted_word_index, confidence))
                                if len(self.prediction_history) > 3:  # Mantener historial de 3 como Predicter.py
                                    self.prediction_history.pop(0)
                                
                                # Verificar predicción estable - MISMA LÓGICA QUE Predicter.py
                                if len(self.prediction_history) >= 2:
                                    recent_predictions = [p[0] for p in self.prediction_history[-2:]]
                                    if all(p == predicted_word_index for p in recent_predictions):
                                        avg_confidence = np.mean([p[1] for p in self.prediction_history[-2:]])
                                        
                                        # Verificar umbral de confianza - USAR 0.8 COMO Predicter.py
                                        if avg_confidence > self.threshold:
                                            if predicted_word_index < len(palabras_disponibles):
                                                predicted_word = palabras_disponibles[predicted_word_index]
                                                
                                                print(f"✅ Reconocido: {predicted_word} (confianza: {avg_confidence:.2f})")
                                                
                                                # REINICIO COMPLETO DESPUÉS DEL RECONOCIMIENTO - MISMA LÓGICA
                                                self.sequence = []  # Limpiar secuencia completamente
                                                self.prediction_history = []  # Limpiar historial de predicciones
                                                self.previous_results = None  # Reiniciar persistencia de manos
                                                self.frames_without_hands = 0  # Reiniciar seguimiento de manos
                                                
                                                print("🔄 Reconocimiento reiniciado - Listo para el siguiente gesto")
                                                
                                                return {
                                                    "word": predicted_word,
                                                    "confidence": float(avg_confidence),
                                                    "status": "recognized"
                                                }
                            
                            except Exception as e:
                                print(f"Error de predicción: {e}")
                                self.sequence = []
                                self.prediction_history = []
                    except Exception as e:
                        print(f"Error de extracción de keypoints: {e}")
                
                # Actualizar previous_results para el siguiente frame
                self.previous_results = enhanced_results
                
                return {
                    "status": "processing",
                    "hands_detected": hands_detected,
                    "sequence_length": len(self.sequence),
                    "hands_count": current_hands
                }
                
        except Exception as e:
            print(f"Error general en process_video_frame: {e}")
            return {
                "status": "error",
                "error": str(e),
                "hands_detected": False,
                "sequence_length": 0
            }

@router.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    """Procesa un archivo de video y retorna palabras reconocidas"""
    # Verificar modelo cargado
    if not loaded_model:
        raise HTTPException(status_code=500, detail="Modelo no cargado")
    # Guardar video en archivo temporal
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
        content = await file.read()
        tmp.write(content)
        video_path = tmp.name
    try:
        # Extraer 20 frames donde se detecten manos
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="No se pudo abrir el video")
        keypoints_list = []
        prev_results = None
        # Configurar Mediapipe Holistic para detección
        with mp.solutions.holistic.Holistic(
            static_image_mode=False,
            model_complexity=0,
            smooth_landmarks=True,
            enable_segmentation=False,
            smooth_segmentation=False,
            refine_face_landmarks=False,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.5
        ) as holistic:
            while cap.isOpened() and len(keypoints_list) < MODEL_FRAMES:
                ret, frame = cap.read()
                if not ret:
                    break
                # Procesar frame
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                rgb.flags.writeable = False
                results = holistic.process(rgb)
                rgb.flags.writeable = True
                # Persistencia de manos
                enhanced = hand_detection_for_keypoints(results, prev_results, force_hands=True)
                prev_results = enhanced
                # Contar manos
                if count_hands_in_results(enhanced) > 0:
                    # Extraer keypoints
                    kp = extract_keypoints(enhanced, prev_results, force_hands=True)
                    keypoints_list.append(kp)
            cap.release()
        # Validar detección
        if not keypoints_list:
            os.unlink(video_path)
            raise HTTPException(status_code=400, detail="No se detectaron manos en el video")
        # Completar hasta 20 frames si faltan
        while len(keypoints_list) < MODEL_FRAMES:
            keypoints_list.append(keypoints_list[-1])
        # Preparar secuencia y predecir
        seq = np.array(keypoints_list)
        normalized = normalize_keypoints(np.expand_dims(seq, axis=0))
        pred = loaded_model.predict(normalized, verbose=0)[0]
        idx = int(np.argmax(pred))
        confidence = float(pred[idx])
        word = palabras_disponibles[idx] if idx < len(palabras_disponibles) else ''
        # Limpiar archivo temporal
        os.unlink(video_path)
        # Alimentar palabras al conector en tiempo real
        sentence_connector.add_word(word)
        # Generar frase compuesta tras detección
        words_list = [word]
        composed_sentence = sentence_connector.process_words(" ".join(words_list))
        # Retornar resultado con oración generada
        return {
            "success": True,
            "recognized_words": [{"word": word, "confidence": confidence}],
            "sentence": composed_sentence,
            "total_frames": MODEL_FRAMES,
            "available_words": palabras_disponibles
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error procesando video: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando video: {e}")

@router.get("/available-words")
async def get_available_words():
    """Retorna las palabras disponibles para reconocimiento"""
    return {
        "words": palabras_disponibles,
        "model_loaded": loaded_model is not None
    }

@router.post("/connect-words")
async def connect_words(words: list[str]):
    """Conecta una lista de palabras usando el conector AI para formar oraciones coherentes"""
    try:
        if not words:
            return {"connected_sentence": "", "original_words": []}
        # Alimentar palabras al conector
        for w in words:
            sentence_connector.add_word(w)
        # Generar frase cuando haya inactividad
        text = " ".join(words)
        connected_sentence = sentence_connector.process_words(text)
        return {"success": True, "connected_sentence": connected_sentence, "original_words": words}
    except Exception as e:
        print(f"Error en connect-words: {e}")
        return {"success": False, "connected_sentence": " ".join(words), "original_words": words, "error": str(e)}

# Función de inicialización
def initialize_video_processing():
    """Inicializa el procesamiento de video cargando el modelo"""
    global loaded_model, palabras_disponibles
    
    try:
        print("🚀 Inicializando procesamiento de video...")
        
        # Cargar palabras disponibles
        palabras_disponibles = get_word_ids(WORDS_JSON_PATH)
        print(f"📝 Palabras disponibles: {palabras_disponibles}")
        
        # Cargar modelo
        print("🤖 Cargando modelo...")
        loaded_model = load_model_robustly(MODEL_PATH)
        
        if loaded_model:
            print("✅ Modelo cargado exitosamente")
            print(f"🎯 Modelo listo para reconocer {len(palabras_disponibles)} palabras")
        else:
            print("❌ Error: No se pudo cargar el modelo")
            
    except Exception as e:
        print(f"❌ Error inicializando video processing: {e}")

# Inicializar al importar el módulo
initialize_video_processing()
    
@router.websocket("/realtime-recognition")
async def realtime_recognition(websocket: WebSocket):
    """WebSocket para reconocimiento en tiempo real y construcción de oraciones"""
    await websocket.accept()
    prev_results = None
    # Buffer de keypoints (no usado directamente aquí, procesamos frame a frame)
    try:
        # Configurar MediaPipe holistic
        with mp.solutions.holistic.Holistic(
            static_image_mode=False,
            model_complexity=0,
            smooth_landmarks=True,
            enable_segmentation=False,
            smooth_segmentation=False,
            refine_face_landmarks=False,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.5
        ) as holistic:
            while True:
                data = await websocket.receive_bytes()
                # Decodificar frame
                nparr = np.frombuffer(data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                # Procesar frame
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                rgb.flags.writeable = False
                results = holistic.process(rgb)
                rgb.flags.writeable = True
                # Mejorar detección de manos
                enhanced = hand_detection_for_keypoints(results, prev_results, force_hands=True)
                prev_results = enhanced
                # Enviar detección de palabra si hay manos
                if count_hands_in_results(enhanced) > 0 and loaded_model:
                    kp = extract_keypoints(enhanced, None, force_hands=True)
                    # Predecir
                    seq = np.expand_dims(kp, axis=0)
                    norm = normalize_keypoints(np.expand_dims(seq, axis=0))
                    pred = loaded_model.predict(norm, verbose=0)[0]
                    idx = int(np.argmax(pred))
                    conf = float(pred[idx])
                    word = palabras_disponibles[idx] if idx < len(palabras_disponibles) else ''
                    # Añadir al conector y enviar
                    sentence_connector.add_word(word)
                    await websocket.send_json({"type": "word", "word": word, "confidence": conf})
                else:
                    # Actualizar estado de manos para conector
                    sentence_connector.update_hands_status(False)
    except Exception as e:
        # Cerrar conexión en error
        await websocket.close()