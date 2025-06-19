import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentForm from '../components/payments/PaymentForm';
import paymentService from '../services/payments/paymentService';
import './pricing_screen.css';
import logo from '../assets/icon-signal.png';

const PricingPage = () => { 
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();  // Obtener el email del usuario desde localStorage o contexto
  React.useEffect(() => {
    const email = localStorage.getItem('email');
    if (email) {
      setUserEmail(email);
    }
  }, []);

  const handlePlanSelection = (planType) => {
    setSelectedPlan(planType);
    
    if (planType === 'free') {
      handleContinueWithFree();
      return;
    }

    // Configurar datos de pago según el plan
    const planConfigs = {
      premium: {
        amount: 29.00,
        plan_type: 'premium',
        name: 'Premium Personal'
      },
      corporate: {
        amount: 199.00,
        plan_type: 'corporate',
        name: 'Corporativo'
      }
    };

    

    const config = planConfigs[planType];
    if (config && userEmail) {
      setPaymentData({
        ...config,
        user_email: userEmail
        
      });
      setShowPaymentForm(true);
    } else if (!userEmail) {
      alert('Por favor, inicia sesión antes de seleccionar un plan premium.');
      navigate('/login');
    }
  };

  const handleContinueWithFree = () => {
    // Redirigir al dashboard principal con plan gratuito
    localStorage.setItem('planType', 'free');
    navigate('/main');
  };

  const handlePaymentComplete = (result) => {
    console.log('Pago completado exitosamente:', result);
    
    // Guardar información del plan en localStorage
    localStorage.setItem('planType', paymentData.plan_type);
    localStorage.setItem('paymentId', result.payment_id);
    
    // Redirigir al dashboard
    navigate('/main', { 
      state: { 
        message: `¡Felicidades! Tu plan ${paymentData.name} está activo.`,
        type: 'success' 
      }
    });
  };

  const handlePaymentError = (error) => {
    console.error('Error en el pago:', error);
    alert(`Error al procesar el pago: ${error.message}`);
    setShowPaymentForm(false);
    setPaymentData(null);
  };

  const handleClosePaymentForm = () => {
    setShowPaymentForm(false);
    setPaymentData(null);
    setSelectedPlan(null);
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
          </div>          <button 
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
          </div>          <button 
            className="plan-button corporate-button"
            onClick={() => handlePlanSelection('corporate')}
          >
            Obtener Plan Corporativo
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
      </div>      <div className="pricing-footer">
        <p className="footer-note">
          Los precios mostrados no incluyen impuestos aplicables. 
          <a href="#terms" className="footer-link">Términos y condiciones</a>
        </p>
        <div className="security-badges">
          <i className="fas fa-shield-alt"></i>
          <span>Pago seguro y encriptado</span>
        </div>
      </div>

      {/* Modal de Formulario de Pago */}
      {showPaymentForm && paymentData && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="payment-modal-header">
              <h2>Completar Pago</h2>
              <button 
                className="close-modal-button"
                onClick={handleClosePaymentForm}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="payment-modal-content">              <PaymentForm
                amount={paymentData.amount}
                planType={paymentData.plan_type}
                onPaymentComplete={handlePaymentComplete}
                onPaymentError={handlePaymentError}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;