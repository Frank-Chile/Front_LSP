import React from "react";
import "./nosotros_screen.css"; // Import your CSS file here
import { Link, useNavigate } from "react-router-dom";

function NosotrosScreen() {
  const navigate = useNavigate();
  
  return (
    <div className="main-container">
      <nav className="navbar">
        <div
          className="navbar-brand"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/main")}
        >
          <h1>SeñalIA</h1>
        </div>
        <div className="user-info">
          <Link className="navbar-link" to="/nosotros">Sobre Nosotros</Link>
          <Link className="navbar-link" to="/help">Ayuda</Link>
        </div>
      </nav>

      <main className="content">
        {/* Hero Section */}
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

        {/* About Content */}
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
      </main>

      <footer className="footer">
        © SEÑALIA 2025. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default NosotrosScreen;