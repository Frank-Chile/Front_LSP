import {useEffect, useState} from "react";
import "./nosotros_screen.css"; // Import your CSS file here
import { Link, useNavigate } from "react-router-dom";
import iconSignal from '../assets/icon-signal.png';

function NosotrosScreen() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userData, setUserData] = useState({ 
    nombre: '', email: '' 
  });
  
  useEffect(() => {
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
    localStorage.removeItem('email');
    localStorage.removeItem('nombre');
    navigate('/');
  };
  
  return (
    <div className="main-container">
      <nav className="navbar">
        <div className="navbar-brand" style={{ cursor: "pointer" }} onClick={() => navigate("/main")}>
          <img src={iconSignal} alt="Señalia Logo" className="brand-logo" />
          <span className="brand-title">SEÑALIA</span>
        </div>
        <div className="user-info">
          <Link className="navbar-link" to="/nosotros">Sobre Nosotros</Link>
          <Link className="navbar-link" to="/help">Ayuda</Link>
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
      </nav>

      <div className="content">
        {/* Hero Section - Fixed */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span>Innovación • Inclusión • Tecnología</span>
            </div>
            <h1 className="hero-title">
              Rompiendo barreras con 
              <span className="gradient-text"> tecnología</span>
            </h1>
            <p className="hero-subtitle">
              Conectamos mundos a través del lenguaje de señas y la inteligencia artificial
            </p>
          </div>
          <div className="hero-visual">
            <div className="floating-card card-1">
              <div className="card-icon">🤝</div>
              <span>Conexión</span>
            </div>
            <div className="floating-card card-2">
              <div className="card-icon">🧠</div>
              <span>IA Avanzada</span>
            </div>
            <div className="floating-card card-3">
              <div className="card-icon">🌍</div>
              <span>Inclusión</span>
            </div>
          </div>
        </section>

        {/* About Content - Scrollable */}
        <section className="about-content">
          <div className="content-grid">
            {/* Mission Card */}
            <div className="info-card mission-card">
              <div className="card-header">
                <div className="card-icon-large">🎯</div>
                <h3>Nuestra Misión</h3>
              </div>
              <p>
                Promover la inclusión social y la igualdad de oportunidades a través de 
                herramientas tecnológicas accesibles para la comunidad sorda.
              </p>
            </div>

            {/* Vision Card */}
            <div className="info-card vision-card">
              <div className="card-header">
                <div className="card-icon-large">🔮</div>
                <h3>Nuestra Visión</h3>
              </div>
              <p>
                Ser la plataforma líder en traducción y reconocimiento de lenguaje 
                de señas en Latinoamérica.
              </p>
            </div>

            {/* Story Card */}
            <div className="info-card story-card">
              <div className="card-header">
                <div className="card-icon-large">💡</div>
                <h3>Nuestra Historia</h3>
              </div>
              <p>
                <strong>SeñalIA</strong> nació de la necesidad de crear puentes de comunicación. 
                Nuestro equipo multidisciplinario combina experiencia en IA, diseño UX y 
                conocimiento profundo de la comunidad sorda para crear soluciones realmente efectivas.
              </p>
            </div>
          </div>

          {/* Team Section */}
          <div className="team-section">
            <h2 className="section-title">Nuestro Equipo</h2>
            <div className="team-grid">
              <div className="team-member">
                <div className="member-avatar">
                  <span>👨‍💻</span>
                </div>
                <h4>Desarrollo IA</h4>
                <p>Especialistas en machine learning y procesamiento de imágenes</p>
              </div>
              <div className="team-member">
                <div className="member-avatar">
                  <span>⚙️</span>
                </div>
                <h4>Desarrollo Backend</h4>
                <p>Expertos en arquitectura y seguridad de sistemas</p>
              </div>
              <div className="team-member">
                <div className="member-avatar">
                  <span>🎨</span>
                </div>
                <h4>Diseño UX/UI</h4>
                <p>Creamos experiencias accesibles e intuitivas</p>
              </div>
              <div className="team-member">
                <div className="member-avatar">
                  <span>🤟</span>
                </div>
                <h4>Comunidad Sorda</h4>
                <p>Consultores y validadores de nuestra comunidad</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Usuarios Activos</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">95%</div>
                <div className="stat-label">Precisión IA</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Disponibilidad</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">15+</div>
                <div className="stat-label">Países</div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="contact-section">
            <div className="contact-card">
              <h3>¿Tienes preguntas?</h3>
              <p>Estamos aquí para ayudarte en tu camino hacia una comunicación sin barreras</p>
              <div className="contact-info">
                <a href="mailto:contacto@senalia.com" className="contact-link">
                  <span className="contact-icon">📧</span>
                  contacto@senalia.com
                </a>
              </div>
              <div className="action-buttons">
                <button
                  className="primary-button"
                  onClick={() => navigate("/main")}
                >
                  Comenzar Ahora
                </button>
                <button
                  className="secondary-button"
                  onClick={() => navigate("/help")}
                >
                  Ver Ayuda
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="footer">
        © SEÑALIA 2025. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default NosotrosScreen;