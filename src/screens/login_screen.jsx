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
    if (email === 'perez@usil.pe' && clave === '123456') {
      console.log('Login successful');
      navigate('/main');
    } else {
      setErrorMessage('Email o clave incorrectos');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Iniciar Sesión</h2>
        <div className="input-group">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required autoComplete='off'
          />
          <label htmlFor="email">Email</label>
        </div>
        <div className="input-group">
          <input
            type="password"
            id="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required autoComplete='off'
          />
          <label htmlFor="password">Password</label>
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
}

export default Login;
