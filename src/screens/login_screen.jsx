import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './login_screen.css';
import logo from '../assets/icon-signal.png'; 
import gifRight from '../assets/login-img-right.gif';

const Login = () => {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();

  // Función para verificar si un campo tiene valor (incluyendo autocompletado)
  const checkAutoFill = () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput && emailInput.value) {
      setEmail(emailInput.value);
      setEmailFocused(true);
    }
    
    if (passwordInput && passwordInput.value) {
      setClave(passwordInput.value);
      setPasswordFocused(true);
    }
  };

  // Verificar autocompletado después del montaje del componente
  useEffect(() => {
    const timer = setTimeout(checkAutoFill, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Intentando iniciar sesión...");
    try {
      const response = await axios.post('http://127.0.0.1:8000/login', {
        email,
        clave,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Respuesta:", response.data);
      
      if (response.data.mensaje === "Login exitoso") {
        localStorage.setItem('email', response.data.email);
        localStorage.setItem('nombre', response.data.nombre);
        navigate('/main');
      } else {
        setErrorMessage('Credenciales inválidas');
      }
    } catch (error) {
      console.error("Error detallado:", error);
      if (error.response) {
        setErrorMessage(error.response.data.detail || 'Error en la autenticación');
      } else if (error.request) {
        setErrorMessage('No se pudo conectar con el servidor');
      } else {
        setErrorMessage('Error al procesar la solicitud');
      }
    }
  };

  return (
    <div className="split-container">
      {/* Mitad izquierda - Formulario */}
      <div className="left-half">
        <div className="branding">
          <div className="logo-title">
            <img src={logo} alt="Logo Señalia" className="brand-logo" />
            <h1>SEÑALIA</h1>
          </div>
          <p className="tagline">Rompe el silencio, conecta con el mundo</p>
        </div>
        
        <form className="login-form" onSubmit={handleLogin}>
          <h2>Iniciar Sesión</h2>
          
          <div className="input-group">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              id="email"
              placeholder=""
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={(e) => setEmailFocused(e.target.value !== '')}
              required 
              autoComplete="email"
              className={email || emailFocused ? 'has-content' : ''}
            />
            <label htmlFor="email" className={email || emailFocused ? 'active' : ''}>Email</label>
          </div>
          
          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder=""
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={(e) => setPasswordFocused(e.target.value !== '')}
              required 
              autoComplete="current-password"
              className={clave || passwordFocused ? 'has-content' : ''}
            />
            <label htmlFor="password" className={clave || passwordFocused ? 'active' : ''}>Password</label>
            <i 
              className={`fas password-toggle ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              onClick={() => setShowPassword(!showPassword)}
            ></i>
          </div>
          
          <div className="extra-options">
            <a href="/forgot-password" className="forgot-link">¿Olvidaste tu clave?</a>
          </div>
          
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          
          <button type="submit" className="login-button">Ingresar</button>
          
          <p className="register-text">
            ¿No tienes una cuenta? <a className="register-link" href="/register">Regístrate</a>
          </p>
        </form>
      </div>
      
      {/* Mitad derecha - Imagen */}
      <div className="right-half">
        <div className="right-content">
          <img src={gifRight} alt="Comunicación visual" className="right-image" />
        </div>
      </div>
    </div>
  );
}

export default Login;
