import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import './register_screen.css';

const RegistroCliente = () => {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

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
        <h2>Registro Cliente</h2>
        <div className="input-group">
          <input 
            type="email" 
            placeholder="Correo Electrónico" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Nombre y Apellidos" 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <input 
            type="tel" 
            placeholder="Teléfono" 
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <input 
            type="password" 
            placeholder="Clave" 
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="register-button">Registrarse</button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default RegistroCliente;
