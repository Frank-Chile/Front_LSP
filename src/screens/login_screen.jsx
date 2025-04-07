import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Importamos useNavigate
import './login_screen.css'; // Asegúrate de tener estilos personalizados

const Login = () => {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
          <i className="fas fa-envelope"></i>
          <input
            type="email"
            id="email"
            placeholder=''
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required autoComplete="off"
          />
          <label htmlFor="email">Email</label>
        </div>
        <div className="input-group">
          <i className="fas fa-lock"></i>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            placeholder=''
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required autoComplete="off"
          />
          <label htmlFor="password">Password</label>
          <i 
            className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} // Cambia el ícono
            onClick={() => setShowPassword(!showPassword)} // Alterna el estado
          ></i>
        </div>
        <div className="extra-options">
          <a href="/forgot-password">¿Olvidaste tu clave?</a>
        </div>
        {errorMessage && <p className="error">{errorMessage}</p>}
        <button type="submit">Ingresar</button>
          <p>
            ¿No tienes una cuenta? <a className='link' href="/register">Regístrate</a>
          </p>
        </form>
      </div>
  );
}

export default Login;
