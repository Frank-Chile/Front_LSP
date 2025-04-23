import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MainScreen.css";
import axios from "axios";

function MainScreen() {
    
    const navigate = useNavigate();
    const [userData, setUserData] = useState({
        nombre: '',
        email: ''
      });
    const storedName = localStorage.getItem("nombre");
    const [userName] = useState(storedName && storedName !== "null" ? storedName : "Sin nombre");
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [transcribedText, setTranscribedText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

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
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        alert('Error al acceder a la cámara.');
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    };

    useEffect(() => {
      // Verificar si hay datos de usuario al cargar
      const email = localStorage.getItem('email');
      const nombre = localStorage.getItem('nombre');
      
      if (!email || !nombre) {
        navigate('/');
        return;
      }
  
      setUserData({
        email,
        nombre
      });
    }, [navigate]);
  
    const handleLogout = () => {
      localStorage.clear();
      navigate('/');
    };


    return (
      <div className="main-container">
        <nav className="navbar">
          <div className="navbar-brand">
            <h1>Señalia</h1>
          </div>
          <div className="user-info">
            <span className="user-name">Bienvenido, {userData.nombre}</span>
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
                  <div className="profile-dropdown-item">
                    <strong>Datos personales</strong>
                    <div>Nombre: {userData.nombre}</div>
                    <div>Email: {userData.email}</div>
                  </div>
                  <div className="profile-dropdown-item">
                    <button
                      className="profile-action"
                      onClick={() => alert("Funcionalidad próximamente")}
                    >
                      Cambiar contraseña
                    </button>
                  </div>
                  <div className="profile-dropdown-item">
                    <button className="profile-action logout" onClick={handleLogout}>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        <main className="content">
          <div className="video-section">
            <h2>Captura de Señas</h2>
            <div className="upload-container">
              <div className="video-controls">
                {!isRecording ? (
                  <button className="record-btn" onClick={startRecording}>
                    Iniciar Grabación
                  </button>
                ) : (
                  <button className="stop-btn" onClick={stopRecording}>
                    Detener Grabación
                  </button>
                )}
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="video-input"
                />
              </div>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`video-player ${isRecording ? "recording" : ""}`}
              />
              {videoUrl && !isRecording && (
                <video
                  src={videoUrl}
                  controls
                  className="video-player recorded"
                />
              )}
            </div>
          </div>

          <div className="text-section">
            <h2>Texto Transcrito</h2>
            <div className="text-container">
              {transcribedText ? (
                <p>{transcribedText}</p>
              ) : (
                <p className="placeholder-text">
                  El texto transcrito aparecerá aquí cuando el video sea procesado.
                </p>
              )}
            </div>
          </div>
        </main>

        <footer className="footer">
          © SEÑALIA 2025. Todos los derechos reservados.
        </footer>
      </div>
    );
  }


export default MainScreen;