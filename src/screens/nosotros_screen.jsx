import React from "react";
import "./MainScreen.css"; // Usa los mismos estilos de MainScreen
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
        <div className="about-section">
          <h2>Sobre Nosotros</h2>
          <p>
            <strong>Señalia</strong> es una plataforma dedicada a la inclusión y accesibilidad para personas con discapacidad auditiva. Nuestro objetivo es facilitar la comunicación mediante el reconocimiento y transcripción de lenguaje de señas a texto, utilizando tecnología de vanguardia.
          </p>
          <p>
            El equipo de Señalia está formado por profesionales apasionados por la tecnología, la educación y la inclusión social. Trabajamos constantemente para mejorar nuestros servicios y ofrecer soluciones innovadoras que ayuden a romper barreras de comunicación.
          </p>
          <h3>Misión</h3>
          <p>
            Promover la inclusión social y la igualdad de oportunidades a través de herramientas tecnológicas accesibles para la comunidad sorda.
          </p>
          <h3>Visión</h3>
          <p>
            Ser la plataforma líder en traducción y reconocimiento de lenguaje de señas en Latinoamérica.
          </p>
          <h3>Contacto</h3>
          <p>
            ¿Tienes preguntas o sugerencias? Escríbenos a <a href="mailto:contacto@senalia.com">contacto@senalia.com</a>
          </p>
          <button
            className="register-button"
            style={{ marginTop: "2rem" }}
            onClick={() => navigate("/main")}
          >
            Volver
          </button>
        </div>
      </main>

      <footer className="footer">
        © SEÑALIA 2025. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default NosotrosScreen;