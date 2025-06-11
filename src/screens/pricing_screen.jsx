import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './pricing_screen.css';
import logo from '../assets/icon-signal.png';

const PricingPage = () => { 
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();

  const handlePlanSelection = (planType) => {
    setSelectedPlan(planType);
    // Aquí puedes agregar la lógica para procesar la selección del plan
    console.log(`Plan seleccionado: ${planType}`);
  };

  const handleContinueWithFree = () => {
    // Redirigir al dashboard principal con plan gratuito
    localStorage.setItem('planType', 'free');
    navigate('/main');
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <div className="logo-section">
          <img src={logo} alt="Logo Señalia" className="pricing-logo" />
          <h1 className="brand-title">SEÑALIA</h1>
        </div>
        <h2 className="pricing-title">Planes que crecen contigo</h2>
        <p className="pricing-subtitle">Elige el plan perfecto para tus necesidades de comunicación</p>
      </div>

      <div className="pricing-cards-container">
        {/* Plan Gratuito */}
        <div className="pricing-card free-card">
          <div className="card-header">
            <div className="plan-header-top">
              <div className="plan-icon">
                <i className="fas fa-seedling"></i>
              </div>
              <h3 className="plan-name">Gratuito</h3>
            </div>
            <p className="plan-description">Prueba SEÑALIA</p>
          </div>
          
          <div className="price-section">
            <span className="currency">S/</span>
            <span className="price">0</span>
            <span className="period">Gratis</span>
          </div>

          <button 
            className="plan-button free-button"
            onClick={handleContinueWithFree}
          >
            Continuar Gratis
          </button>

          <div className="features-section">
            <h4>Lo que incluye:</h4>
            <ul className="features-list">
              <li><i className="fas fa-check"></i> Traductor básico de señas</li>
              <li><i className="fas fa-check"></i> 10 consultas diarias</li>
              <li><i className="fas fa-check"></i> Diccionario básico LSP</li>
              <li><i className="fas fa-check"></i> Acceso web y móvil</li>
              <li><i className="fas fa-check"></i> Soporte por email</li>
            </ul>
          </div>
        </div>

        {/* Plan Premium Personal */}
        <div className="pricing-card premium-card popular">
          <div className="popular-badge">
            <i className="fas fa-star"></i>
            Más Popular
          </div>
          
          <div className="card-header">
            <div className="plan-header-top">
              <div className="plan-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <h3 className="plan-name">Premium Personal</h3>
            </div>
            <p className="plan-description">Para uso individual avanzado</p>
          </div>
          
          <div className="price-section">
            <span className="currency">S/</span>
            <span className="price">29</span>
            <span className="period">/ mes</span>
          </div>

          <button 
            className="plan-button premium-button"
            onClick={() => handlePlanSelection('premium')}
          >
            Obtener Premium Personal
          </button>

          <div className="features-section">
            <h4>Todo lo gratuito, más:</h4>
            <ul className="features-list">
              <li><i className="fas fa-check"></i> Consultas ilimitadas</li>
              <li><i className="fas fa-check"></i> Traductor avanzado con IA</li>
              <li><i className="fas fa-check"></i> Diccionario completo LSP</li>
              <li><i className="fas fa-check"></i> Reconocimiento de gestos en tiempo real</li>
              <li><i className="fas fa-check"></i> Historial de traducciones</li>
              <li><i className="fas fa-check"></i> Modo sin conexión limitado</li>
              <li><i className="fas fa-check"></i> Soporte prioritario 24/7</li>
              <li><i className="fas fa-check"></i> Personalización de avatares</li>
            </ul>
          </div>
        </div>

        {/* Plan Corporativo */}
        <div className="pricing-card corporate-card">
          <div className="card-header">
            <div className="plan-header-top">
              <div className="plan-icon">
                <i className="fas fa-building"></i>
              </div>
              <h3 className="plan-name">Corporativo</h3>
            </div>
            <p className="plan-description">Para empresas e instituciones</p>
          </div>
          
          <div className="price-section">
            <span className="currency">Desde S/</span>
            <span className="price">199</span>
            <span className="period">/ mes</span>
            <small className="billing-note">Facturación anual</small>
          </div>

          <button 
            className="plan-button corporate-button"
            onClick={() => handlePlanSelection('corporate')}
          >
            Contactar Ventas
          </button>

          <div className="features-section">
            <h4>Todo lo Premium, más:</h4>
            <ul className="features-list">
              <li><i className="fas fa-check"></i> Usuarios ilimitados</li>
              <li><i className="fas fa-check"></i> Panel de administración</li>
              <li><i className="fas fa-check"></i> API personalizada</li>
              <li><i className="fas fa-check"></i> Integración con sistemas existentes</li>
              <li><i className="fas fa-check"></i> Capacitación personalizada</li>
              <li><i className="fas fa-check"></i> Soporte técnico dedicado</li>
              <li><i className="fas fa-check"></i> SLA garantizado 99.9%</li>
              <li><i className="fas fa-check"></i> Reportes y analytics avanzados</li>
              <li><i className="fas fa-check"></i> Cumplimiento normativo</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pricing-footer">
        <p className="footer-note">
          Los precios mostrados no incluyen impuestos aplicables. 
          <a href="#terms" className="footer-link">Términos y condiciones</a>
        </p>
        <div className="security-badges">
          <i className="fas fa-shield-alt"></i>
          <span>Pago seguro y encriptado</span>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;