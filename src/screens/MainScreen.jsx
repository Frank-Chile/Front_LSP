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
      });
    const storedName = localStorage.getItem("nombre");
    const [userName] = useState(storedName && storedName !== "null" ? storedName : "Sin nombre");
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [userPlan, setUserPlan] = useState('free'); // Estado para el plan del usuario

    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [transcribedText, setTranscribedText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const [showAbout, setShowAbout] = useState(false);
    

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

    const handleClearVideo = () => {
      setVideoUrl(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };


    const handleClearText = () => {
      setTranscribedText("");
    };

    useEffect(() => {
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
    };


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
                </div>

                {/* Contenedor de videos */}
                <div className="upload-container">
                  <video
                    ref={videoRef}
                    autoPlay={!videoUrl}
                    muted
                    playsInline
                    controls={!!videoUrl} // Muestra controles si ya hay video cargado
                    src={videoUrl || undefined}
                    className={`video-player ${isRecording ? "recording" : ""} ${videoUrl ? "recorded" : ""}`}
                  />
                  <div className="video-btn">
                    {/* Botón de limpiar */}
                    {videoUrl && !isRecording && (
                      <button className="clear-video-btn" onClick={handleClearVideo}>
                        Limpiar Video
                      </button>
                    )}
                    {/* Boton procesar */}
                    {videoUrl && !isRecording && (
                    <button className="process-video-btn">
                      Procesar
                    </button>
                    )}
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
                </div>
                
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