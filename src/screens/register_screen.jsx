import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import './register_screen.css';

const RegistroCliente = () => {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();  // Aquí estamos usando useNavigate correctamente
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nuevoCliente = {
      email: email,
      nombre: nombre,
      telefono: telefono,
      clave: clave,
    };

    try {
      const response = await fetch('http://localhost:8080/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevoCliente),
      });

      if (response.ok) {
        alert('Cliente registrado exitosamente');
        setEmail('');
        setNombre('');
        setTelefono('');
        setClave('');
        navigate('/')
      } else {
        setError('Error al registrar cliente');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red');
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
