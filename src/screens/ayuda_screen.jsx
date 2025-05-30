import React, {useState, useEffect} from 'react';
import './ayuda_screen.css';
import { Link, useNavigate } from 'react-router-dom';
import iconSignal from '../assets/icon-signal.png';

const AyudaScreen = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('getting-started');
    const [searchTerm, setSearchTerm] = useState('');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [userData, setUserData] = useState({ nombre: '', email: '' });
    
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

    // Función para hacer scroll a la sección seleccionada
    const handleSectionClick = (sectionId) => {
        setActiveSection(sectionId);
        setSearchTerm(''); // Limpiar búsqueda al cambiar sección
        
        // Hacer scroll a la sección
        setTimeout(() => {
            const sectionElement = document.getElementById(`section-${sectionId}`);
            if (sectionElement) {
                sectionElement.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100);
    };

  const sections = [
    {
      id: 'getting-started',
      title: 'Primeros Pasos',
      icon: '🚀',
      content: [
        {
          question: '¿Cómo empezar a usar la aplicación?',
          answer: 'Simplemente abre la cámara, coloca tus manos frente a ella y comienza a hacer señas. La aplicación traducirá automáticamente tus gestos a texto en tiempo real.'
        },
        {
          question: '¿Qué necesito para usar la aplicación?',
          answer: 'Solo necesitas una cámara web o la cámara de tu dispositivo móvil. Asegúrate de tener buena iluminación y un fondo despejado para mejores resultados.'
        },
        {
          question: '¿Es compatible con todos los dispositivos?',
          answer: 'Sí, nuestra aplicación funciona en computadoras, tablets y smartphones con navegadores modernos que soporten acceso a cámara.'
        }
      ]
    },
    {
      id: 'translation',
      title: 'Traducción',
      icon: '✋',
      content: [
        {
          question: '¿Qué idiomas de señas soporta?',
          answer: 'Actualmente soportamos Lengua de Señas Mexicana (LSM), Lengua de Señas Americana (ASL) y Lengua de Señas Española (LSE). Estamos trabajando para añadir más idiomas.'
        },
        {
          question: '¿Cómo mejorar la precisión de la traducción?',
          answer: 'Mantén tus manos bien iluminadas, usa un fondo uniforme, realiza las señas de forma clara y mantén una distancia adecuada de la cámara (aproximadamente 1 metro).'
        },
        {
          question: '¿La traducción funciona en tiempo real?',
          answer: 'Sí, la traducción se realiza en tiempo real con una latencia mínima. Verás el texto aparecer casi instantáneamente mientras realizas las señas.'
        }
      ]
    },
    {
      id: 'camera',
      title: 'Configuración de Cámara',
      icon: '📷',
      content: [
        {
          question: '¿Cómo configurar la cámara?',
          answer: 'Ve a configuración y selecciona tu cámara preferida. Puedes ajustar la resolución, brillo y contraste para optimizar la detección de señas.'
        },
        {
          question: '¿Qué hacer si la cámara no funciona?',
          answer: 'Verifica que hayas dado permisos de cámara al navegador, comprueba que no esté siendo usada por otra aplicación y reinicia el navegador si es necesario.'
        },
        {
          question: '¿Puedo usar múltiples cámaras?',
          answer: 'Actualmente soportamos una cámara a la vez, pero puedes cambiar entre cámaras disponibles en la configuración.'
        }
      ]
    },
    {
      id: 'tips',
      title: 'Consejos y Trucos',
      icon: '💡',
      content: [
        {
          question: '¿Cómo obtener mejores resultados?',
          answer: 'Usa ropa de colores sólidos que contrasten con tus manos, evita fondos con patrones complejos y mantén las manos dentro del área de detección mostrada en pantalla.'
        },
        {
          question: '¿Qué hacer si no reconoce mis señas?',
          answer: 'Intenta realizar las señas más lentamente, verifica que estés usando el diccionario de señas correcto para tu región y asegúrate de que la iluminación sea adecuada.'
        },
        {
          question: '¿Puedo guardar mis traducciones?',
          answer: 'Sí, puedes guardar el historial de traducciones en la sección "Historial" y exportarlas como archivo de texto si lo necesitas.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Solución de Problemas',
      icon: '🔧',
      content: [
        {
          question: 'La aplicación va lenta, ¿qué puedo hacer?',
          answer: 'Cierra otras aplicaciones que usen la cámara, reduce la calidad de video en configuración, o reinicia la aplicación. También verifica tu conexión a internet.'
        },
        {
          question: '¿Por qué no aparece texto en pantalla?',
          answer: 'Verifica que la cámara esté funcionando, que tengas buena iluminación y que estés realizando señas reconocibles. También revisa que no tengas silenciada la función de texto.'
        },
        {
          question: '¿Cómo reportar un error?',
          answer: 'Usa el botón "Reportar Error" en configuración, describe detalladamente el problema y adjunta una captura de pantalla si es posible.'
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    content: section.content.filter(item =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.content.length > 0 || searchTerm === '');

  return (
        <div className="main-container">
            <nav className="navbar">
                <div className="navbar-brand" style={{ cursor: "pointer" }} onClick={() => navigate("/main")}>
                          <img src={iconSignal} alt="Señalia Logo" className="brand-logo" />
                          <span className="brand-title">SEÑALIA</span>
                </div>
                <div className="user-info">
                    <Link className="navbar-link" to="/nosotros">Sobre Nosotros</Link>
                    <Link className="navbar-link" to="/ayuda">Ayuda</Link>
                </div>
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
            </nav>
            <div className="ayuda-container">
            <div className="ayuda-header">
                <div className="header-content">
                <h1 className="ayuda-title">
                    <span className="title-icon">🤝</span>
                    Centro de Ayuda
                </h1>
                <p className="ayuda-subtitle">
                    Todo lo que necesitas saber sobre la traducción de lenguaje de señas
                </p>
                </div>
                
                <div className="search-container">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                    type="text"
                    placeholder="Buscar en la ayuda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                    />
                </div>
                </div>
            </div>

            <div className="ayuda-content">
                <nav className="ayuda-sidebar">
                <div className="sidebar-header">
                    <h3>Categorías</h3>
                </div>
                <ul className="sidebar-menu">
                    {sections.map((section) => (
                    <li
                        key={section.id}
                        className={`menu-item ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => handleSectionClick(section.id)}
                    >
                        <span className="menu-icon">{section.icon}</span>
                        <span className="menu-text">{section.title}</span>
                    </li>
                    ))}
                </ul>
                </nav>

                <main className="ayuda-main">
                {filteredSections.length === 0 ? (
                    <div className="no-results">
                    <div className="no-results-icon">🔍</div>
                    <h3>No se encontraron resultados</h3>
                    <p>Intenta con otros términos de búsqueda</p>
                    </div>
                ) : (
                    filteredSections
                    .filter(section => !searchTerm || section.id === activeSection || searchTerm)
                    .map((section) => (
                        <section key={section.id} id={`section-${section.id}`} className="help-section">
                        <div className="section-header">
                            <span className="section-icon">{section.icon}</span>
                            <h2 className="section-title">{section.title}</h2>
                        </div>
                        
                        <div className="faq-list">
                            {section.content.map((item, index) => (
                            <div key={index} className="faq-item">
                                <div className="faq-question">
                                <span className="question-icon">❓</span>
                                <h4>{item.question}</h4>
                                </div>
                                <div className="faq-answer">
                                <p>{item.answer}</p>
                                </div>
                            </div>
                            ))}
                        </div>
                        </section>
                    ))
                )}
                </main>
            </div>

            <div className="ayuda-footer">
                <div className="footer-content">
                <div className="contact-section">
                    <h3>¿Aún necesitas ayuda?</h3>
                    <p>Nuestro equipo está aquí para apoyarte</p>
                    <div className="contact-buttons">
                    <button className="contact-btn primary">
                        <span>📧</span>
                        Contactar Soporte
                    </button>
                    <button className="contact-btn secondary">
                        <span>💬</span>
                        Chat en Vivo
                    </button>
                    </div>
                </div>
                
                <div className="resources-section">
                    <h4>Recursos Adicionales</h4>
                    <ul className="resources-list">
                    <li><a href="#tutorials">📚 Tutoriales en Video</a></li>
                    <li><a href="#dictionary">📖 Diccionario de Señas</a></li>
                    <li><a href="#community">👥 Comunidad</a></li>
                    <li><a href="#updates">🔄 Actualizaciones</a></li>
                    </ul>
                </div>
                </div>
            </div>
            </div>
        </div>
  );
};

export default AyudaScreen;