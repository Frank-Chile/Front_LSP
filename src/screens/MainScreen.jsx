import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import iconSignal from "../assets/icon-signal.png";
import "./MainScreen.css";
import axios from "axios";
import { Link } from "react-router-dom";

function MainScreen() {
    
    const navigate = useNavigate();
    const [userData, setUserData] = useState({
        nombre: '',
        email: ''
      });    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [userPlan, setUserPlan] = useState('free'); // Estado para el plan del usuario
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [transcribedText, setTranscribedText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recognizedWords, setRecognizedWords] = useState([]);
    const [availableWords, setAvailableWords] = useState([]);
    const [isRealTimeActive, setIsRealTimeActive] = useState(false);
    const [realTimeWords, setRealTimeWords] = useState([]);
    const [realTimeSentence, setRealTimeSentence] = useState("");
    const [websocket, setWebsocket] = useState(null);
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const realTimeVideoRef = useRef(null);    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    

    const handleVideoUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
      }
    };
      

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          setVideoUrl(videoUrl);
          setVideoFile(new File([blob], "recorded-video.webm", { type: 'video/webm' }));
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        };        mediaRecorder.start();
        setIsRecording(true);
      } catch {
        alert('Error al acceder a la cámara.');
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    };

    const handleClearVideo = () => {
      setVideoUrl(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
    const handleClearText = () => {
      setTranscribedText("");
      setRecognizedWords([]);
    };

    // Función para procesar el video con IA
    const handleProcessVideo = async () => {
      if (!videoFile) {
        alert('Por favor, graba o sube un video primero.');
        return;
      }

      setIsProcessing(true);
      setTranscribedText("Procesando video...");

      try {
        const formData = new FormData();
        formData.append('file', videoFile);

        const response = await axios.post('http://localhost:8000/video/process-video', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          const { recognized_words } = response.data;
          setRecognizedWords(recognized_words);
          
            if (recognized_words.length > 0) {
              // Conectar siempre las palabras reconocidas y mostrar la frase generada
              const words = recognized_words.map(w => w.word);
              try {
                const connectResponse = await axios.post(
                  'http://localhost:8000/video/connect-words',
                  words
                );
                setTranscribedText(connectResponse.data.connected_sentence);
                console.log("Palabras", recognizedWords)
              } catch (connectError) {
                console.error('Error conectando palabras:', connectError);
                setTranscribedText('');
              }
            } else {
              setTranscribedText("No se reconocieron palabras en el video. Asegúrate de que tus manos sean visibles y realices gestos claros.");
          }
        } else {
          setTranscribedText("Error procesando el video. Inténtalo nuevamente.");
        }
      } catch (error) {
        console.error('Error procesando video:', error);
        if (error.response?.status === 500) {
          setTranscribedText("Error del servidor. El modelo de IA podría no estar disponible.");
        } else {
          setTranscribedText("Error de conexión. Verifica que el servidor esté funcionando.");
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // Función para obtener palabras disponibles
    const fetchAvailableWords = async () => {
      try {
        const response = await axios.get('http://localhost:8000/video/available-words');
        setAvailableWords(response.data.words || []);
      } catch (error) {
        console.error('Error obteniendo palabras disponibles:', error);
      }
    };    useEffect(() => {
      const email = localStorage.getItem('email');
      const nombre = localStorage.getItem('nombre');
      const planType = localStorage.getItem('planType');
      
      if (!email || !nombre) {
        navigate('/');
        return;
      }

      // Si no tiene plan, redirigir a pricing
      if (!planType) {
        navigate('/pricing');
        return;
      }
  
      setUserData({
        email,
        nombre
      });
      setUserPlan(planType);

      // Cargar palabras disponibles
      fetchAvailableWords();
    }, [navigate]);

    const getPlanDisplayName = (plan) => {
      switch(plan) {
        case 'free': return 'Gratuito';
        case 'premium': return 'Premium Personal';
        case 'corporate': return 'Corporativo';
        default: return 'Gratuito';
      }
    };

    const handleUpgradePlan = () => {
      navigate('/pricing');
    };
  
    const handleLogout = () => {
      localStorage.clear();
      navigate('/');
    };    // Función para iniciar reconocimiento en tiempo real
    const handleRealTimeRecognition = async () => {
      if (!isRealTimeActive) {
        try {
          console.log('🚀 Iniciando modo cámara en tiempo real...');
          
          // 1. Verificar permisos de cámara primero
          try {
            const permissions = await navigator.permissions.query({ name: 'camera' });
            console.log('📷 Estado de permisos de cámara:', permissions.state);
            
            if (permissions.state === 'denied') {
              alert('❌ Los permisos de cámara están denegados. Por favor, habilítalos en la configuración del navegador.');
              return;
            }          } catch {
            console.log('ℹ️ No se pudieron verificar permisos, continuando...');
          }
          
          // 2. Obtener acceso a la cámara con configuración específica
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              facingMode: 'user',
              frameRate: { ideal: 30, max: 30 }
            },
            audio: false
          });
          console.log('✅ Cámara obtenida exitosamente');
          console.log('📹 Stream activo:', stream.active);
          console.log('📹 Tracks de video:', stream.getVideoTracks().length);
          
          // Verificar que el track de video esté activo
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('📹 Video track estado:', videoTrack.readyState);
            console.log('📹 Video track settings:', videoTrack.getSettings());
          }
            streamRef.current = stream;
            // PROTECCIÓN: Evitar que el stream se desactive automáticamente
          const streamVideoTrack = stream.getVideoTracks()[0];
          if (streamVideoTrack) {
            streamVideoTrack.addEventListener('ended', () => {
              console.warn('⚠️ Video track terminó inesperadamente - reactivando automáticamente...');
              // Reactivar inmediatamente cuando el track termine
              setTimeout(async () => {
                if (isRealTimeActive) {
                  try {
                    console.log('🔄 Reactivando cámara automáticamente...');
                    const newStream = await navigator.mediaDevices.getUserMedia({ 
                      video: { 
                        width: { ideal: 640, max: 1280 },
                        height: { ideal: 480, max: 720 },
                        facingMode: 'user',
                        frameRate: { ideal: 30, max: 30 }
                      },
                      audio: false
                    });
                    
                    // Aplicar todas las protecciones al nuevo stream
                    window.currentStream = newStream;
                    streamRef.current = newStream;
                    
                    if (realTimeVideoRef.current) {
                      realTimeVideoRef.current.srcObject = newStream;
                      await realTimeVideoRef.current.play();
                    }
                    
                    console.log('✅ Cámara reactivada automáticamente');
                  } catch (error) {
                    console.error('❌ Error reactivando cámara automáticamente:', error);
                  }
                }
              }, 1000);
            });
            
            streamVideoTrack.addEventListener('mute', () => {
              console.warn('⚠️ Video track silenciado inesperadamente');
            });
            
            // Prevenir que el track se termine por inactividad
            streamVideoTrack.enabled = true;
            
            // Verificación periódica del estado del track con reactivación automática
            const trackCheckInterval = setInterval(async () => {
              if (streamVideoTrack.readyState === 'ended' && isRealTimeActive) {
                console.error('❌ Video track terminó en verificación periódica - reactivando...');
                clearInterval(trackCheckInterval);
                
                try {
                  const newStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                      width: { ideal: 640, max: 1280 },
                      height: { ideal: 480, max: 720 },
                      facingMode: 'user',
                      frameRate: { ideal: 30, max: 30 }
                    },
                    audio: false
                  });
                  
                  window.currentStream = newStream;
                  streamRef.current = newStream;
                  
                  if (realTimeVideoRef.current) {
                    realTimeVideoRef.current.srcObject = newStream;
                    await realTimeVideoRef.current.play();
                  }
                  
                  console.log('✅ Cámara reactivada en verificación periódica');
                } catch (error) {
                  console.error('❌ Error reactivando en verificación periódica:', error);
                }
              }
            }, 3000); // Check cada 3 segundos
              // Limpiar interval cuando se detenga el reconocimiento
            stream.trackCheckInterval = trackCheckInterval;
              // Agregar protección adicional del stream con reactivación automática
            const streamHealthCheck = setInterval(async () => {
              if (stream.active && realTimeVideoRef.current && isRealTimeActive) {
                const currentSrcObject = realTimeVideoRef.current.srcObject;
                if (!currentSrcObject || currentSrcObject !== stream) {
                  console.warn('⚠️ Stream perdido en check de salud, reasignando...');
                  realTimeVideoRef.current.srcObject = stream;
                  
                  // Si el stream también está inactivo, reactivar completamente
                  if (!stream.active) {
                    console.log('🔄 Stream inactivo, reactivando completamente...');
                    try {
                      const newStream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                          width: { ideal: 640, max: 1280 },
                          height: { ideal: 480, max: 720 },
                          facingMode: 'user',
                          frameRate: { ideal: 30, max: 30 }
                        },
                        audio: false
                      });
                      
                      window.currentStream = newStream;
                      streamRef.current = newStream;
                      realTimeVideoRef.current.srcObject = newStream;
                      await realTimeVideoRef.current.play();
                      
                      console.log('✅ Stream reactivado completamente en health check');
                    } catch (error) {
                      console.error('❌ Error reactivando stream en health check:', error);
                    }
                  }
                }
                
                // Verificar que el video sigue reproduciendo
                if (realTimeVideoRef.current.paused) {
                  try {
                    await realTimeVideoRef.current.play();
                    console.log('✅ Video reanudado en health check');
                  } catch (error) {
                    console.warn('⚠️ No se pudo reanudar video en health check:', error);
                  }
                }
              }
            }, 2000); // Check cada 2 segundos
            
            stream.healthCheckInterval = streamHealthCheck;
          }// 3. Configurar video element inmediatamente
          if (realTimeVideoRef.current) {
            console.log('🎬 Configurando elemento de video...');
            
            // Limpiar cualquier stream anterior
            realTimeVideoRef.current.srcObject = null;
            
            // Configurar propiedades del video ANTES de asignar el stream
            realTimeVideoRef.current.muted = true;
            realTimeVideoRef.current.playsInline = true;
            realTimeVideoRef.current.autoplay = true;
            
            // CRÍTICO: Mantener referencia fuerte del stream
            window.currentStream = stream; // Prevenir garbage collection
            
            // CRÍTICO: Verificar que el stream sigue activo
            if (!stream.active) {
              throw new Error('Stream se desactivó antes de asignarlo al video');
            }
            
            // Verificar que los tracks estén activos
            const videoTrack = stream.getVideoTracks()[0];
            if (!videoTrack || videoTrack.readyState !== 'live') {
              throw new Error('Video track no está en estado "live"');
            }
            
            console.log('📹 Asignando stream al video...');
            
            // Configurar video element con mejores propiedades
            realTimeVideoRef.current.setAttribute('webkit-playsinline', 'true');
            realTimeVideoRef.current.setAttribute('playsinline', 'true');
            realTimeVideoRef.current.defaultMuted = true;
              // Asignar nuevo stream de forma síncrona
            realTimeVideoRef.current.srcObject = stream;
            
            // Verificación inmediata múltiple con refuerzo
            const reinforceStream = () => {
              if (realTimeVideoRef.current && realTimeVideoRef.current.srcObject !== stream) {
                console.warn('⚠️ srcObject se perdió, reasignando...');
                realTimeVideoRef.current.srcObject = stream;
              }
            };
            
            setTimeout(reinforceStream, 10);
            setTimeout(reinforceStream, 50);
            setTimeout(reinforceStream, 100);
            setTimeout(reinforceStream, 250);
            setTimeout(reinforceStream, 500);
            
            // Esperar a que el video esté listo
            await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                console.error('❌ Timeout: Video no se cargó en 15 segundos');
                console.log('🔍 Estado final del video:');
                console.log('- srcObject:', realTimeVideoRef.current.srcObject);
                console.log('- readyState:', realTimeVideoRef.current.readyState);
                console.log('- stream active:', stream.active);
                reject(new Error('Timeout: Video no se cargó'));
              }, 15000); // Aumentar timeout
              
              const handleMetadata = () => {
                console.log('✅ Video metadata cargada');
                console.log(`📐 Dimensiones del video: ${realTimeVideoRef.current.videoWidth}x${realTimeVideoRef.current.videoHeight}`);
                console.log(`🎛️ Ready State: ${realTimeVideoRef.current.readyState}`);
                console.log(`📹 srcObject presente: ${!!realTimeVideoRef.current.srcObject}`);
                
                if (realTimeVideoRef.current.videoWidth === 0) {
                  console.error('❌ Video sin dimensiones válidas');
                  clearTimeout(timeoutId);
                  reject(new Error('Video sin dimensiones válidas'));
                  return;
                }
                
                clearTimeout(timeoutId);
                
                // Intentar reproducir el video múltiples veces si es necesario
                const attemptPlay = async (attempt = 1) => {
                  try {
                    await realTimeVideoRef.current.play();
                    console.log('✅ Video reproduciendo exitosamente');
                    console.log('▶️ Video paused:', realTimeVideoRef.current.paused);
                    console.log('🔊 Video muted:', realTimeVideoRef.current.muted);
                    resolve();
                  } catch (playError) {
                    console.log(`⚠️ Intento ${attempt} de reproducción falló:`, playError.message);
                    
                    if (attempt < 3) {
                      // Verificar que el srcObject siga presente
                      if (!realTimeVideoRef.current.srcObject) {
                        console.log('🔄 Reasignando stream perdido...');
                        realTimeVideoRef.current.srcObject = stream;
                      }
                      
                      setTimeout(() => attemptPlay(attempt + 1), 500);
                    } else {
                      console.log('ℹ️ Todos los intentos de reproducción fallaron, pero continuando...');
                      resolve(); // Continuar de todas formas
                    }
                  }
                };
                
                attemptPlay();
              };
              
              // Múltiples listeners para capturar el evento de metadata
              realTimeVideoRef.current.onloadedmetadata = handleMetadata;
              
              // Listener adicional para cuando el video puede reproducirse
              realTimeVideoRef.current.oncanplay = () => {
                console.log('✅ Video puede reproducirse');
                if (realTimeVideoRef.current.readyState >= 2 && realTimeVideoRef.current.videoWidth > 0) {
                  handleMetadata();
                }
              };
              
              realTimeVideoRef.current.onplaying = () => {
                console.log('▶️ Video comenzó a reproducirse');
              };
              
              realTimeVideoRef.current.onerror = (e) => {
                console.error('❌ Error en video element:', e);
                clearTimeout(timeoutId);
                reject(new Error(`Error en video element: ${e.message || 'Unknown error'}`));
              };
              
              realTimeVideoRef.current.onstalled = () => {
                console.warn('⚠️ Video stalled - verificando stream...');
                if (!stream.active) {
                  console.error('❌ Stream se desactivó durante la carga');
                }
              };
              
              realTimeVideoRef.current.onabort = () => {
                console.warn('⚠️ Video aborted');
              };
              
              // Si ya tiene metadata, procesarla inmediatamente
              if (realTimeVideoRef.current.readyState >= 1) {
                console.log('ℹ️ Video ya tiene metadata, procesando inmediatamente');
                handleMetadata();
              }
                // Verificación periódica del estado
              const checkInterval = setInterval(() => {
                if (realTimeVideoRef.current && realTimeVideoRef.current.srcObject) {
                  console.log('🔄 Check periódico - readyState:', realTimeVideoRef.current.readyState);
                  if (realTimeVideoRef.current.readyState >= 1) {
                    clearInterval(checkInterval);
                    handleMetadata();
                  }
                } else {
                  console.warn('⚠️ srcObject se perdió durante la espera');
                  if (stream && stream.active) {
                    console.log('🔄 Reasignando stream perdido en check periódico...');
                    realTimeVideoRef.current.srcObject = stream;
                  } else {
                    console.error('❌ Stream ya no está activo');
                    clearInterval(checkInterval);
                  }
                }
              }, 1000);
              
              // Limpiar interval en caso de timeout
              setTimeout(() => {
                clearInterval(checkInterval);
                console.log('⏰ Timeout del check periódico');
              }, 15000);
            });
          }
          
          // 4. Establecer estado como activo
          setIsRealTimeActive(true);
          setRealTimeWords([]);
          setRealTimeSentence("");
          
          // 5. Intentar conexión WebSocket después de que todo esté listo
          setTimeout(() => {
            tryWebSocketConnection();
          }, 1500);
          
        } catch (error) {
          console.error('❌ Error completo:', error);
          
          // Mensajes de error más específicos
          if (error.name === 'NotAllowedError') {
            alert('❌ Acceso a la cámara denegado. Por favor, permite el acceso y reintenta.');
          } else if (error.name === 'NotFoundError') {
            alert('❌ No se encontró una cámara. Conecta una cámara y reintenta.');
          } else if (error.name === 'NotReadableError') {
            alert('❌ La cámara está siendo usada por otra aplicación. Ciérrala y reintenta.');
          } else if (error.name === 'OverconstrainedError') {
            alert('❌ La configuración de cámara no es compatible. Intenta con una cámara diferente.');
          } else {
            alert(`❌ Error: ${error.message}`);
          }
          
          // Limpiar en caso de error
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          setIsRealTimeActive(false);
        }
      } else {
        stopRealTimeRecognition();
      }
    };// Función separada para intentar conexión WebSocket
    const tryWebSocketConnection = () => {
      try {
        console.log('🔌 Intentando conexión WebSocket...');
        console.log('URL del WebSocket: ws://localhost:8000/video/realtime-recognition');
        
        // Probar primero conectividad HTTP
        fetch('http://localhost:8000/video/available-words')
          .then(() => {
            console.log('✅ Servidor HTTP accesible');
            
            // Ahora intentar WebSocket
            console.log('🔗 Creando nueva conexión WebSocket...');
            const ws = new WebSocket('ws://localhost:8000/video/realtime-recognition');
            setWebsocket(ws);
            
            console.log('📊 Estado inicial del WebSocket:', ws.readyState);
            console.log('📊 Estados WebSocket: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3');
            
            const connectionTimeout = setTimeout(() => {
              console.log('⏰ Timeout alcanzado después de 15 segundos');
              console.log('📊 Estado final del WebSocket:', ws.readyState);
              if (ws.readyState !== WebSocket.OPEN) {
                console.log('❌ WebSocket no se conectó - cerrando...');
                ws.close();
                alert('No se pudo conectar al servidor. Verifica que el backend esté funcionando.');
              }
            }, 15000); // Aumentar timeout a 15 segundos
            
            ws.onopen = () => {
              console.log('✅ WebSocket conectado exitosamente');
              clearTimeout(connectionTimeout);
              
              // Esperar un poco más antes de iniciar captura para asegurar estabilidad
              setTimeout(() => {
                startFrameCapture(ws);
              }, 1000);
            };
            
            ws.onmessage = (event) => {
              try {
                const message = JSON.parse(event.data);
                console.log('📨 Mensaje del servidor:', message.type);
                
                if (message.type === 'result') {
                  const data = message.data;
                  if (data.status === 'word_recognized') {
                    setRealTimeWords(data.words_session || []);
                    console.log('🤟 Palabra:', data.word);
                  } else if (data.status === 'sentence_formed') {
                    setRealTimeWords(data.words_session || []);
                    setRealTimeSentence(data.sentence);
                    console.log('📝 Oración:', data.sentence);
                  }
                } else if (message.type === 'connection_established') {
                  console.log('✅ Conexión confirmada por el servidor');
                }
              } catch (parseError) {
                console.error('❌ Error parseando mensaje:', parseError);
              }
            };
            
            ws.onerror = (error) => {
              console.log('❌ Error WebSocket:', error);
              console.log('Estado del WebSocket en error:', ws.readyState);
              clearTimeout(connectionTimeout);
              alert('Error de conexión con el servidor de reconocimiento');
            };
            
            ws.onclose = (event) => {
              console.log('🔌 WebSocket cerrado - Código:', event.code, 'Razón:', event.reason);
              clearTimeout(connectionTimeout);
              
              // Intentar reconexión automática si no fue intencional
              if (isRealTimeActive && event.code !== 1000) {
                console.log('🔄 Intentando reconexión automática en 3 segundos...');
                setTimeout(() => {
                  if (isRealTimeActive) {
                    tryWebSocketConnection();
                  }
                }, 3000);
              }
            };
          })
          .catch(error => {
            console.log('❌ Servidor HTTP no accesible:', error);
            alert('No se puede conectar al servidor. Asegúrate de que el backend esté ejecutándose en http://localhost:8000');
          });
        
      } catch (error) {
        console.log('❌ Error creando WebSocket:', error);
        alert('Error técnico al crear la conexión WebSocket');
      }
    };const startFrameCapture = (ws) => {
      console.log('🎬 Iniciando captura de frames...');
      
      const canvas = canvasRef.current;
      const video = realTimeVideoRef.current;
      
      if (!canvas || !video) {
        console.error('❌ Canvas o video no disponible');
        return;
      }
      
      const context = canvas.getContext('2d');
      let frameCount = 0;
      let isCapturing = true;
      
      const captureFrame = () => {
        try {
          // Verificar que todo sigue activo
          if (!isCapturing || !isRealTimeActive || ws.readyState !== WebSocket.OPEN) {
            console.log('🛑 Deteniendo captura de frames');
            return;
          }
          
          // Verificar que el video está listo y reproduciéndose
          if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0 && !video.paused) {
            try {
              // Configurar canvas al tamaño del video si es necesario
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = Math.min(video.videoWidth, 640);
                canvas.height = Math.min(video.videoHeight, 480);
                console.log(`📐 Canvas configurado: ${canvas.width}x${canvas.height}`);
              }
              
              // Dibujar frame actual
              context.clearRect(0, 0, canvas.width, canvas.height);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              // Convertir a base64 con mejor compresión
              const frameData = canvas.toDataURL('image/jpeg', 0.3); // Reducir calidad para mejor rendimiento
              
              // Enviar frame al servidor
              ws.send(JSON.stringify({
                type: 'frame',
                data: frameData
              }));
              
              frameCount++;
              if (frameCount % 30 === 0) { // Reducir logs
                console.log(`📹 Frames enviados: ${frameCount}`);
              }
              
            } catch (drawError) {
              console.error('❌ Error dibujando frame:', drawError);
            }
          } else {
            // Video no está listo, intentar reproducir
            if (video.paused) {
              video.play().catch(() => {
                // Ignorar errores de autoplay
              });
            }
          }
          
          // Programar siguiente captura con menor frecuencia para mejor rendimiento
          if (isCapturing && isRealTimeActive) {
            setTimeout(captureFrame, 200); // 5 FPS en lugar de 2 FPS
          }
        } catch (error) {
          console.error('❌ Error en captureFrame:', error);
          if (isCapturing && isRealTimeActive) {
            setTimeout(captureFrame, 1000); // Reintentar en 1 segundo
          }
        }
      };
      
      // Función para detener captura
      const stopCapture = () => {
        isCapturing = false;
        console.log('🛑 Captura de frames detenida');
      };
      
      // Guardar función de stop para uso externo
      ws.stopFrameCapture = stopCapture;
      
      // Inicializar captura con verificación de estado del video
      const initCapture = () => {
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
          console.log('✅ Video listo, iniciando captura inmediata');
          captureFrame();
        } else {
          console.log('⏳ Esperando que video esté listo...');
          video.addEventListener('canplay', () => {
            console.log('✅ Video puede reproducirse, iniciando captura');
            setTimeout(captureFrame, 500);
          }, { once: true });
        }
      };
      
      // Dar tiempo al video para estar completamente listo
      setTimeout(initCapture, 500);
    };    const stopRealTimeRecognition = () => {
      console.log('🛑 Deteniendo reconocimiento...');
      
      // 1. Detener captura de frames primero
      if (websocket && websocket.stopFrameCapture) {
        websocket.stopFrameCapture();
      }
      
      // 2. Cerrar WebSocket con un pequeño delay
      setTimeout(() => {
        if (websocket) {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.close(1000, 'Usuario detuvo reconocimiento');
          }
          setWebsocket(null);
        }
      }, 100);
        // 3. Detener cámara con delay adicional
      setTimeout(() => {
        if (streamRef.current) {
          // Limpiar intervals si existen
          if (streamRef.current.trackCheckInterval) {
            clearInterval(streamRef.current.trackCheckInterval);
          }
          if (streamRef.current.healthCheckInterval) {
            clearInterval(streamRef.current.healthCheckInterval);
          }
          
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('🔌 Track detenido:', track.kind);
          });
          streamRef.current = null;
        }
        
        // Limpiar referencia global
        if (window.currentStream) {
          delete window.currentStream;
        }
        
        // Limpiar video element
        if (realTimeVideoRef.current) {
          realTimeVideoRef.current.srcObject = null;
          realTimeVideoRef.current.load(); // Forzar reset del elemento video
        }
      }, 200);
      
      // 4. Actualizar estado
      setIsRealTimeActive(false);
      setRealTimeWords([]);
      setRealTimeSentence("");
      
      console.log('✅ Reconocimiento detenido completamente');
    };
    
    const resetRealTimeSession = () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'reset'
        }));
        setRealTimeWords([]);
        setRealTimeSentence("");
      }
    };    // Cleanup al desmontar componente
    useEffect(() => {
      // Listener para cambios de visibilidad (prevenir que la cámara se apague al cambiar de tab)
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible' && isRealTimeActive) {
          console.log('🔄 Pestaña visible nuevamente, verificando cámara...');
          
          // Verificar que el stream sigue active
          if (streamRef.current && !streamRef.current.active) {
            console.log('🔄 Stream inactivo después de cambio de visibilidad, reactivando...');
            try {
              const newStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                  width: { ideal: 640, max: 1280 },
                  height: { ideal: 480, max: 720 },
                  facingMode: 'user',
                  frameRate: { ideal: 30, max: 30 }
                },
                audio: false
              });
              
              window.currentStream = newStream;
              streamRef.current = newStream;
              
              if (realTimeVideoRef.current) {
                realTimeVideoRef.current.srcObject = newStream;
                await realTimeVideoRef.current.play();
              }
              
              console.log('✅ Cámara reactivada después de cambio de visibilidad');
            } catch (error) {
              console.error('❌ Error reactivando después de cambio de visibilidad:', error);
            }
          } else if (realTimeVideoRef.current && !realTimeVideoRef.current.srcObject) {
            // Solo reasignar el stream si se perdió
            console.log('🔄 Reasignando stream después de cambio de visibilidad...');
            realTimeVideoRef.current.srcObject = streamRef.current;
            try {
              await realTimeVideoRef.current.play();
              console.log('✅ Stream reasignado después de cambio de visibilidad');
            } catch (error) {
              console.warn('⚠️ Error reasignando stream:', error);
            }
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Listener adicional para cuando la ventana pierde/gana foco
      const handleWindowFocus = async () => {
        if (isRealTimeActive) {
          console.log('🔄 Ventana enfocada, verificando estado de cámara...');
          
          // Pequeño delay para permitir que el navegador restaure recursos
          setTimeout(async () => {
            if (streamRef.current && realTimeVideoRef.current) {
              // Verificar si el video sigue reproduciendo
              if (realTimeVideoRef.current.srcObject !== streamRef.current) {
                console.log('🔄 Reasignando stream tras focus...');
                realTimeVideoRef.current.srcObject = streamRef.current;
              }
              
              if (realTimeVideoRef.current.paused) {
                try {
                  await realTimeVideoRef.current.play();
                  console.log('✅ Video reanudado tras focus');
                } catch (error) {
                  console.warn('⚠️ Error reanudando video tras focus:', error);
                }
              }
            }
          }, 500);
        }
      };
      
      const handleWindowBlur = () => {
        if (isRealTimeActive) {
          console.log('ℹ️ Ventana desenfocada, manteniendo stream activo...');
          // Mantener el stream activo incluso cuando la ventana pierde foco
          if (streamRef.current && realTimeVideoRef.current) {
            // Asegurar que el video sigue teniendo el stream asignado
            if (!realTimeVideoRef.current.srcObject) {
              realTimeVideoRef.current.srcObject = streamRef.current;
            }
          }
        }
      };
      
      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('blur', handleWindowBlur);
        return () => {
        // Remover listeners
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('blur', handleWindowBlur);
        
        // Cerrar conexión WebSocket al desmontar
        if (websocket) {
          websocket.close();
        }
        // Detener stream de cámara
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }, [websocket, isRealTimeActive]);

    return (
      <div className="main-container">

        <nav className="navbar">

          <div className="navbar-brand">
            <img src={iconSignal} alt="Señalia-Logo" className="brand-logo" />
            <h1 className="brand-title">SEÑALIA</h1>
          </div>

          <div className="user-info">
            <span className="user-name">Bienvenido, {userData.nombre}</span>
            <Link className="navbar-link" to="/nosotros">Sobre Nosotros</Link>
            <Link className="navbar-link" to="/ayuda">Ayuda</Link>
          
            <div className="plan-indicator">
              <span className={`plan-badge ${userPlan}`}>
                Plan {getPlanDisplayName(userPlan)}
              </span>
            </div>

            <div className="profile-menu-container">
              <button
                className="profile-btn"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                aria-label="Abrir menú de perfil"
              >
                Perfil &#9662;
              </button>
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-item profile-data">
                      <strong>Datos Personales</strong>
                      <div>Nombre: {userData.nombre}</div>
                      <div>Email: {userData.email}</div>
                      <div>Plan: {getPlanDisplayName(userPlan)}</div>
                  </div>

                    {userPlan === 'free' && (
                      <div className="profile-dropdown-item">
                        <button className="profile-upgrade-btn" onClick={handleUpgradePlan}>
                          Mejorar Plan
                        </button>
                      </div>
                    )}

                    <div className="profile-dropdown-item">
                      <button
                        className="profile-action"
                        onClick={() => alert("Funcionalidad próximamente")}
                      >
                        Cambiar contraseña
                      </button>
                    </div>

                    <div className="profile-dropdown-item">
                      <button className="profile-logout" onClick={handleLogout}>
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </nav>

        <main className="content">
          {/* Contenedor principal para el banner y las secciones */}
          <div className="main-content-wrapper">
            {/* Banner de limitación de plan (ahora arriba de todo) */}
            {userPlan === 'free' && (
              <div className="plan-limitation-banner">
                <div className="limitation-content">
                  <i className="fas fa-info-circle"></i>
                  <span>Tienes 10 consultas diarias disponibles.</span>
                  <button className="upgrade-banner-btn" onClick={handleUpgradePlan}>
                    Mejorar a Premium
                  </button>
                </div>
              </div>
            )}

            {/* Contenedor horizontal para video y texto */}
            <div className="sections-container">
              <div className="video-section">
                {/* Header horizontal */}
                <div className="video-header">
                  <h2>Captura de Señas</h2>
                  {!isRecording ? (
                    <button className="record-btn" onClick={startRecording}>
                      Grabar
                    </button>
                  ) : (
                    <button className="stop-btn" onClick={stopRecording}>
                      Detener
                    </button>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="video-input"
                  />
                </div>                {/* Contenedor de videos */}
                <div className="upload-container">
                  <video
                    ref={videoRef}
                    autoPlay={!videoUrl}
                    muted
                    playsInline
                    controls={!!videoUrl} // Muestra controles si ya hay video cargado
                    src={videoUrl || undefined}
                    className={`video-player ${isRecording ? "recording" : ""} ${videoUrl ? "recorded" : ""}`}
                    style={{ display: isRealTimeActive ? 'none' : 'block' }}
                  />
                    {/* Video para tiempo real */}
                  {isRealTimeActive && (
                    <div className="realtime-container">
                      <video                        ref={realTimeVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="realtime-video"
                        onLoadedMetadata={() => console.log('🎬 Video metadata loaded in DOM')}
                        onCanPlay={() => console.log('🎬 Video can play in DOM')}
                        onPlaying={() => console.log('🎬 Video playing in DOM')}
                        onError={(e) => console.error('🎬 Video error in DOM:', e)}
                        onPause={() => {
                          console.warn('⚠️ Video pausado, intentando reanudar...');
                          if (isRealTimeActive && realTimeVideoRef.current) {
                            realTimeVideoRef.current.play().catch(error => {
                              console.error('❌ Error reanudando video pausado:', error);
                            });
                          }
                        }}
                        onSuspend={() => {
                          console.warn('⚠️ Video suspendido');
                        }}
                        onAbort={() => {
                          console.warn('⚠️ Video abortado, verificando stream...');
                          if (isRealTimeActive && streamRef.current && realTimeVideoRef.current) {
                            setTimeout(() => {
                              if (!realTimeVideoRef.current.srcObject) {
                                console.log('🔄 Reasignando stream tras abort...');
                                realTimeVideoRef.current.srcObject = streamRef.current;
                              }
                            }, 100);
                          }
                        }}
                        onWaiting={() => {
                          console.log('⏳ Video esperando datos...');
                        }}
                        onStalled={() => {
                          console.warn('⚠️ Video stalled, verificando stream...');
                          if (isRealTimeActive && streamRef.current && realTimeVideoRef.current) {
                            if (!realTimeVideoRef.current.srcObject) {
                              console.log('🔄 Reasignando stream tras stall...');
                              realTimeVideoRef.current.srcObject = streamRef.current;
                            }
                          }
                        }}
                      />
                      <canvas
                        ref={canvasRef}
                        width="640"
                        height="480"
                        style={{ display: 'none' }}
                      />
                      <div className="realtime-controls">
                        <button 
                          className="reset-session-btn"
                          onClick={resetRealTimeSession}
                        >
                          Reiniciar Sesión
                        </button>                        <button 
                          className="test-camera-btn"
                          onClick={async () => {
                            console.log('🔍 Estado detallado del video:');
                            if (realTimeVideoRef.current) {
                              console.log('- readyState:', realTimeVideoRef.current.readyState);
                              console.log('- videoWidth:', realTimeVideoRef.current.videoWidth);
                              console.log('- videoHeight:', realTimeVideoRef.current.videoHeight);
                              console.log('- paused:', realTimeVideoRef.current.paused);
                              console.log('- muted:', realTimeVideoRef.current.muted);
                              console.log('- srcObject:', realTimeVideoRef.current.srcObject);
                              console.log('- currentSrc:', realTimeVideoRef.current.currentSrc);
                            }
                            
                            console.log('🔍 Estado del stream:');
                            if (streamRef.current) {
                              console.log('- stream active:', streamRef.current.active);
                              console.log('- video tracks:', streamRef.current.getVideoTracks().length);
                              const videoTrack = streamRef.current.getVideoTracks()[0];
                              if (videoTrack) {
                                console.log('- track readyState:', videoTrack.readyState);
                                console.log('- track enabled:', videoTrack.enabled);
                                console.log('- track settings:', videoTrack.getSettings());
                              }
                            } else {
                              console.log('- No hay stream en streamRef');
                            }
                              // Intentar reactivar si es necesario
                            if (!streamRef.current || !streamRef.current.active) {
                              console.log('🔄 Intentando reactivar cámara...');
                              try {
                                // Detener stream anterior completamente
                                if (streamRef.current) {
                                  streamRef.current.getTracks().forEach(track => track.stop());
                                  if (streamRef.current.trackCheckInterval) {
                                    clearInterval(streamRef.current.trackCheckInterval);
                                  }
                                  if (streamRef.current.healthCheckInterval) {
                                    clearInterval(streamRef.current.healthCheckInterval);
                                  }
                                }
                                
                                const newStream = await navigator.mediaDevices.getUserMedia({ 
                                  video: { 
                                    width: { ideal: 640, max: 1280 },
                                    height: { ideal: 480, max: 720 },
                                    facingMode: 'user',
                                    frameRate: { ideal: 30, max: 30 }
                                  },
                                  audio: false
                                });
                                
                                // Aplicar todas las protecciones al nuevo stream
                                window.currentStream = newStream;
                                
                                const videoTrack = newStream.getVideoTracks()[0];
                                if (videoTrack) {
                                  videoTrack.addEventListener('ended', () => {
                                    console.warn('⚠️ Nuevo video track terminó inesperadamente');
                                  });
                                  
                                  videoTrack.addEventListener('mute', () => {
                                    console.warn('⚠️ Nuevo video track silenciado inesperadamente');
                                  });
                                  
                                  // Verificación periódica del estado del track
                                  const trackCheckInterval = setInterval(() => {
                                    if (videoTrack.readyState === 'ended') {
                                      console.error('❌ Nuevo video track terminó - intentando reactivar...');
                                      clearInterval(trackCheckInterval);
                                    }
                                  }, 5000);
                                  
                                  newStream.trackCheckInterval = trackCheckInterval;
                                  
                                  // Agregar protección adicional del stream
                                  const streamHealthCheck = setInterval(() => {
                                    if (newStream.active && realTimeVideoRef.current) {
                                      const currentSrcObject = realTimeVideoRef.current.srcObject;
                                      if (!currentSrcObject || currentSrcObject !== newStream) {
                                        console.warn('⚠️ Nuevo stream perdido en check de salud, reasignando...');
                                        realTimeVideoRef.current.srcObject = newStream;
                                      }
                                    }
                                  }, 2000);
                                  
                                  newStream.healthCheckInterval = streamHealthCheck;
                                }
                                
                                streamRef.current = newStream;
                                if (realTimeVideoRef.current) {
                                  realTimeVideoRef.current.srcObject = newStream;
                                  
                                  // Reforzar asignación múltiples veces
                                  setTimeout(() => {
                                    if (realTimeVideoRef.current.srcObject !== newStream) {
                                      realTimeVideoRef.current.srcObject = newStream;
                                    }
                                  }, 100);
                                  
                                  setTimeout(() => {
                                    if (realTimeVideoRef.current.srcObject !== newStream) {
                                      realTimeVideoRef.current.srcObject = newStream;
                                    }
                                  }, 500);
                                  
                                  await realTimeVideoRef.current.play();
                                }
                                console.log('✅ Cámara reactivada completamente con protecciones');
                              } catch (error) {
                                console.error('❌ Error reactivando cámara:', error);
                              }
                            } else if (realTimeVideoRef.current && !realTimeVideoRef.current.srcObject) {
                              console.log('🔄 Reasignando stream al video...');
                              realTimeVideoRef.current.srcObject = streamRef.current;
                              try {
                                await realTimeVideoRef.current.play();
                                console.log('✅ Video reasignado y reproduciendo');
                              } catch (error) {
                                console.error('❌ Error reproduciendo video reasignado:', error);
                              }
                            } else {
                              // Intentar reproducir manualmente
                              try {
                                await realTimeVideoRef.current.play();
                                console.log('✅ Video reproduciendo manualmente');
                              } catch (error) {
                                console.error('❌ Error reproduciendo manualmente:', error);
                              }
                            }
                          }}
                        >
                          🔍 Debug & Fix
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="video-btn">
                    {/* Botón de limpiar */}
                    {videoUrl && !isRecording && (
                      <button className="clear-video-btn" onClick={handleClearVideo}>
                        Limpiar Video
                      </button>                    )}                    {/* Boton procesar */}
                    {videoUrl && !isRecording && (
                    <button 
                      className="process-video-btn" 
                      onClick={handleProcessVideo}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Procesando...' : 'Procesar con IA'}
                    </button>
                    )}
                    
                    {/* Botón tiempo real */}
                    <button 
                      className={`realtime-btn ${isRealTimeActive ? 'active' : ''}`}
                      onClick={handleRealTimeRecognition}
                    >
                      {isRealTimeActive ? 'Detener Tiempo Real' : 'Reconocimiento en Tiempo Real'}
                    </button>
                  </div>
                </div>
              </div>


              <div className="text-section">
                {/* NUEVA ESTRUCTURA: Header horizontal con H2 y botón limpiar */}
                <div className="text-header">
                  <h2>Texto Transcrito</h2>
                  <button className="clear-btn" onClick={handleClearText}>
                    Limpiar
                  </button>
                </div>                  <div className="text-container">
                  {isRealTimeActive ? (
                    <div className="realtime-results">
                      <h3>Reconocimiento en Tiempo Real</h3>
                      
                      {realTimeWords.length > 0 && (
                        <div className="realtime-words">
                          <h4>Palabras Reconocidas:</h4>
                          <div className="words-list">
                            {realTimeWords.map((word, index) => (
                              <span key={index} className="word-tag realtime">
                                {word.word} ({(word.confidence * 100).toFixed(1)}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {realTimeSentence && (
                        <div className="realtime-sentence">
                          <h4>Oración Formada:</h4>
                          <p className="sentence-text">{realTimeSentence}</p>
                        </div>
                      )}
                      
                      {realTimeWords.length === 0 && !realTimeSentence && (
                        <p className="placeholder-text">
                          Realiza señas frente a la cámara para reconocimiento en tiempo real...
                        </p>
                      )}
                    </div>
                  ) : transcribedText ? (
                    <div>
                      <p><strong>Resultado:</strong> {transcribedText}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="placeholder-text">
                        El texto transcrito aparecerá aquí cuando el video sea procesado.
                      </p>
                      {availableWords.length > 0 && (
                        <div style={{ marginTop: '15px', fontSize: '0.9em', color: '#888' }}>
                          <strong>Palabras disponibles para reconocer:</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                            {availableWords.map((word, index) => (
                              <span key={index} style={{ 
                                background: '#f0f0f0', 
                                padding: '2px 6px', 
                                borderRadius: '3px',
                                fontSize: '0.8em'
                              }}>
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="footer">
          © SEÑALIA 2025. Derechos reservados
        </footer>
      </div>
    );
  }


export default MainScreen;