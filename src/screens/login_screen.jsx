import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Importamos useNavigate
import './login_screen.css'; // Asegúrate de tener estilos personalizados

const Login = () => {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Realiza la llamada al backend para autenticar al usuario
      const response = await axios.post('http://localhost:8080/api/clientes/login', {
        email,
        clave,
      });

      if (response.data) {
        // Guarda el token o los detalles del usuario según la respuesta del backend
        console.log('Login successful', response.data);
        navigate('/main')
      }
    } catch (error) {
      setErrorMessage('Email o clave incorrectos');
      console.error('Error durante el login', error);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Iniciar Sesión</h2>
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Clave</label>
          <input
            type="password"
            id="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </div>
        <div className="extra-options">
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Recordarme
          </label>
          <a href="/forgot-password">¿Olvidaste tu clave?</a>
        </div>
        {errorMessage && <p className="error">{errorMessage}</p>}
        <button type="submit">Ingresar</button>
        <p>
          ¿No tienes una cuenta? <a href="/register">Regístrate</a>
        </p>
      </form>
    </div>
  );
};

export default Login;
