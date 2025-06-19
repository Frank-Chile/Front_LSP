# sentence_connector.py - Conecta las palabras reconocidas en frases coherentes en tiempo real

import os
import sys
import time
from groq import Groq
from collections import deque
import threading
import KEYS

# Configuración
API_KEY = KEYS.GROQ_KEY_LLAMA
WORDS_TO_COLLECT = 4  # Número de palabras a recoger antes de procesar
PROCESSING_DELAY = 1.0  # Segundos de espera antes de procesar nuevas palabras
INACTIVITY_TIMEOUT = 7.0  # Segundos sin nuevas palabras para procesar las existentes

class SignLanguageConnector:
    def __init__(self):
        # Conf del cliente Groq con la API key
        os.environ["GROQ_API_KEY"] = API_KEY
        self.client = Groq(api_key=API_KEY)
        
        # Cola para mantener las últimas palabras reconocidas
        self.word_queue = deque(maxlen=WORDS_TO_COLLECT*2)  # Mayor capacidad para permitir acumulación
        
        # Control para el procesamiento en tiempo real
        self.last_word_time = 0
        self.last_process_time = 0
        self.processing_lock = threading.Lock()
        
        # Variables para controlar el estado de detección
        self.hands_detected = True
        self.no_detection_start_time = None
        self.no_detection_timeout = 3.0  # Segundos sin detección antes de procesar
        
        # Iniciar hilo de monitoreo
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_queue)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        print("\n=== Asistente de conexión de palabras en tiempo real ===")
        print(f"Las palabras se procesarán cuando no se detecten gestos por {self.no_detection_timeout} segundos")
        
    def add_word(self, word):
        """Añade una palabra a la cola en tiempo real"""
        # Normalizar la palabra
        word = word.upper()
        
        # Añadir palabra a la cola con tiempo actual
        self.word_queue.append((word, time.time()))
        self.last_word_time = time.time()
        
        print(f"Palabra reconocida: {word} | Cola actual: {[w[0] for w in self.word_queue]}")
    
    def update_hands_status(self, hands_detected):
        """Actualiza el estado de detección de manos"""
        current_time = time.time()
        
        if hands_detected:
            # Si se detectan manos, resetear el tiempo de no detección
            self.hands_detected = True
            self.no_detection_start_time = None
        else:
            # Si no se detectan manos
            self.hands_detected = False
            if self.no_detection_start_time is None:
                # Comenzar a contar tiempo sin detección
                self.no_detection_start_time = current_time
    
    def _monitor_queue(self):
        """Hilo de monitoreo para procesar palabras automáticamente"""
        while self.running:
            current_time = time.time()
            
            # Verificar condiciones de procesamiento
            with self.processing_lock:
                should_process = False
                words_to_process = []
                
                # Solo procesar si hay palabras en la cola
                if len(self.word_queue) > 0:
                    # Condición principal: No se detectan gestos por un tiempo específico
                    if (not self.hands_detected and 
                        self.no_detection_start_time is not None and
                        current_time - self.no_detection_start_time >= self.no_detection_timeout):
                        
                        # Procesar todas las palabras en la cola
                        words_to_process = [w[0] for w in self.word_queue]
                        should_process = True
                        print(f"\n No se detectan gestos por {self.no_detection_timeout}s - Procesando palabras acumuladas")
                        
                    # Condición de respaldo: Muchas palabras acumuladas (seguridad)
                    elif len(self.word_queue) >= WORDS_TO_COLLECT * 2:
                        words_to_process = [w[0] for w in list(self.word_queue)[-WORDS_TO_COLLECT:]]
                        should_process = True
                        print(f"\n Demasiadas palabras acumuladas - Procesando por seguridad")
                
                if should_process and words_to_process:
                    self._process_word_list(words_to_process)
                    self.last_process_time = current_time
                    # Limpiar cola después del procesamiento
                    self.word_queue.clear()
                    # Resetear estado de no detección
                    self.no_detection_start_time = None
            
            # Dormir brevemente para no consumir CPU
            time.sleep(0.1)
    
    def _process_word_list(self, words):
        """Procesa una lista de palabras"""
        words_text = " ".join(words)
        print(f"\n Procesando grupo de palabras: {words_text}")
        self.process_words(words_text)
        
        # Eliminar las palabras procesadas de la cola
        # (mantener solo las más recientes que no se procesaron)
        processed_count = len(words)
        for _ in range(min(processed_count, len(self.word_queue))):
            if self.word_queue:
                self.word_queue.popleft()
    
    def process_words(self, words):
        """Procesa un conjunto de palabras para crear una oración coherente"""
        try:
            # Crear la solicitud a Groq
            completion = self.client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": "actuaras como un asistente que dado un connjunto de palabras le daras el mejor conector posible, ejemplo: input \"hola yo tu amigo\" respuesta \"hola yo soy tu amigo\""
                    },
                    {
                        "role": "assistant",
                        "content": "Hola, yo soy tu amigo"
                    },
                    {
                        "role": "user",
                        "content": "Hola yo tu jugar"
                    },
                    {
                        "role": "assistant",
                        "content": "Hola, quiero jugar contigo"
                    },
                    {
                        "role": "user",
                        "content": "tu abarazar yo"
                    },
                    {
                        "role": "assistant",
                        "content": "Abrázame"
                    },
                    {
                        "role": "user",
                        "content": "yo ronald"
                    },
                    {
                        "role": "assistant",
                        "content": "Soy Ronald"
                    },
                    {
                        "role": "user",
                        "content": words
                    }
                ],
                temperature=1,
                max_completion_tokens=1024,
                top_p=1,
                stream=False,  # Cambio a False para obtener respuesta completa de una vez
                stop=None,
            )
            
            # Obtener respuesta completa
            response_text = completion.choices[0].message.content
            
            # Mostrar la respuesta con formato destacado
            print(f"\n FRASE CONSTRUIDA: \"{response_text}\"")
            print("-" * 50)
            
            return response_text
            
        except Exception as e:
            print(f"\nError al procesar palabras: {e}")
            return None
    
    def stop(self):
        """Detiene el hilo de monitoreo"""
        self.running = False
        if self.monitor_thread.is_alive():
            self.monitor_thread.join(1.0)

import os
import sys
import codecs

def integrate_with_recognition(recognition_py_path):
    """
    Modifica el archivo recognition.py para integrarlo con el conector en tiempo real
    con manejo explícito de la codificación de caracteres
    """
    try:
        # Intenta leer con diferentes codificaciones
        content = None
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with codecs.open(recognition_py_path, 'r', encoding=encoding) as file:
                    content = file.read()
                print(f"Archivo leído correctamente con codificación {encoding}")
                break
            except UnicodeDecodeError:
                print(f"No se pudo leer con codificación {encoding}")
        
        if content is None:
            print("No se pudo leer el archivo con ninguna codificación probada")
            return False
        
        # Verificar si ya está modificado
        if "from sentence_connector import SignLanguageConnector" in content:
            print("El archivo recognition.py ya está modificado.")
            return True
        
        # Importaciones necesarias
        imports_to_add = "\nfrom sentence_connector import SignLanguageConnector\n"
        
        # Buscar donde inicializar el conector
        init_connector = """
    # Inicializar el conector de oraciones en tiempo real
    sentence_connector = SignLanguageConnector()
        """
        
        # Código para llamar al conector cuando se reconoce una palabra
        connector_call = """
                            # Enviar la palabra reconocida al conector en tiempo real
                            sentence_connector.add_word(predicted_word)
        """
        
        # Código para detener el conector al cerrar la aplicación
        stop_connector = """
        # Detener el conector de oraciones
        if 'sentence_connector' in locals():
            sentence_connector.stop()
        """
        
        # Insertar importaciones al inicio
        import_position = content.find("import os")
        if import_position != -1:
            content = content[:import_position] + imports_to_add + content[import_position:]
        else:
            content = imports_to_add + content
        
        # Insertar inicialización del conector
        init_position = content.find("# Variables for recognition")
        if init_position != -1:
            content = content[:init_position] + init_connector + content[init_position:]
        
        # Insertar llamada al conector después del reconocimiento de palabra
        call_position = content.find("cooldown = 10  # Small wait time between predictions")
        if call_position != -1:
            call_end_position = content.find("\n", call_position)
            content = content[:call_end_position+1] + connector_call + content[call_end_position+1:]
        
        # Insertar código para detener el conector antes de limpiar recursos
        cleanup_position = content.find("# Clean up")
        if cleanup_position != -1:
            content = content[:cleanup_position] + stop_connector + content[cleanup_position:]
        
        # Crear una copia de respaldo del archivo original
        backup_path = recognition_py_path + '.bak'
        with codecs.open(backup_path, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Copia de seguridad creada: {backup_path}")
        
        # Guardar el archivo modificado
        with codecs.open(recognition_py_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        print("Archivo recognition.py modificado correctamente para procesamiento en tiempo real.")
        return True
        
    except Exception as e:
        print(f"Error al modificar el archivo: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=== Integrador del Conector de Oraciones ===")
    recognition_py = input("Ingresa la ruta al archivo recognition.py: ")
    
    if not os.path.exists(recognition_py):
        print(f"Error: No se encontró el archivo {recognition_py}")
        return
        
    integrate_with_recognition(recognition_py)

if __name__ == "__main__":
    main()