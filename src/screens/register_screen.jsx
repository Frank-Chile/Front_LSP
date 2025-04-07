import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import './register_screen.css';

const RegistroCliente = () => {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (email && nombre && telefono && clave) {
      console.log('Registro exitoso:', { email, nombre, telefono, clave });
      setEmail('');
      setNombre('');
      setTelefono('');
      setClave('');
      navigate('/');
    } else {
      setError('Todos los campos son obligatorios');
    }
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Registro de Usuario</h2>
        <div className="input-group">
          <i className="fas fa-envelope"></i>
          <input 
            type="email"
            id="email"
            placeholder=''
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required autoComplete='off'
          />
          <label>Email</label>
        </div>
        <div className="input-group">
          <i className='fas fa-user'></i>
          <input 
            type="text" 
            id="nombre"
            placeholder='' 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required autoComplete='off'
          />
          <label>Nombre y Apellidos</label>
        </div>
        <div className="input-group">
          <i className='fas fa-phone'></i>
          <input 
            type="tel" 
            id="telefono"
            placeholder=''
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required autoComplete='off'
          />
          <label>Teléfono</label>
        </div>
        <div className="input-group">
          <i className='fas fa-lock'></i>
          <input 
            type={showPassword ? 'text' : 'password'}
            id="clave" 
            placeholder=''
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required autoComplete='off'
          />
          <label>Contraseña</label>
          <i 
            className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} // Cambia el ícono
            onClick={() => setShowPassword(!showPassword)} // Alterna el estado
          ></i>
        </div>
        <button type="submit" className="register-button">Registrarse</button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default RegistroCliente;
