import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentResponse.css';

const PaymentResponse = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [transactionToken, setTransactionToken] = useState('');

  useEffect(() => {
    // Obtener parámetros de la URL
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('status');
    const token = params.get('token');

    setStatus(paymentStatus || 'error');
    setTransactionToken(token || '');
  }, [location]);

  const handleReturnHome = () => {
    navigate('/dashboard');
  };

  const handleRetryPayment = () => {
    navigate('/pricing');
  };

  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <div className="payment-response-success">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h1>¡Pago Exitoso!</h1>
            <p>Tu pago ha sido procesado correctamente.</p>
            {transactionToken && (
              <div className="transaction-info">
                <h3>Información de la Transacción</h3>
                <p><strong>Token:</strong> {transactionToken}</p>
                <p><strong>Estado:</strong> Completado</p>
                <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-PE')}</p>
              </div>
            )}
            <div className="success-benefits">
              <h3>¡Tu plan está activo!</h3>
              <ul>
                <li>Acceso completo a todas las funciones</li>
                <li>Reconocimiento de lenguaje de señas en tiempo real</li>
                <li>Historial de traducciones</li>
                <li>Soporte prioritario</li>
              </ul>
            </div>
            <div className="action-buttons">
              <button className="primary-button" onClick={handleReturnHome}>
                <i className="fas fa-home"></i>
                Ir al Dashboard
              </button>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="payment-response-failed">
            <div className="failed-icon">
              <i className="fas fa-times-circle"></i>
            </div>
            <h1>Pago Fallido</h1>
            <p>No se pudo procesar tu pago. Por favor, intenta nuevamente.</p>
            <div className="failed-reasons">
              <h3>Posibles causas:</h3>
              <ul>
                <li>Fondos insuficientes en la tarjeta</li>
                <li>Información de tarjeta incorrecta</li>
                <li>Transacción cancelada por el usuario</li>
                <li>Problema de conectividad</li>
              </ul>
            </div>
            <div className="action-buttons">
              <button className="primary-button" onClick={handleRetryPayment}>
                <i className="fas fa-redo"></i>
                Intentar de Nuevo
              </button>
              <button className="secondary-button" onClick={handleReturnHome}>
                <i className="fas fa-home"></i>
                Volver al Inicio
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="payment-response-error">
            <div className="error-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h1>Error en el Pago</h1>
            <p>Ocurrió un error inesperado durante el procesamiento del pago.</p>
            <div className="error-help">
              <h3>¿Necesitas ayuda?</h3>
              <p>Si el problema persiste, contacta a nuestro equipo de soporte:</p>
              <ul>
                <li>📧 Email: soporte@lsp-app.com</li>
                <li>📞 Teléfono: +51 999 888 777</li>
                <li>💬 Chat en vivo disponible 24/7</li>
              </ul>
            </div>
            <div className="action-buttons">
              <button className="primary-button" onClick={handleRetryPayment}>
                <i className="fas fa-redo"></i>
                Intentar de Nuevo
              </button>
              <button className="secondary-button" onClick={handleReturnHome}>
                <i className="fas fa-home"></i>
                Volver al Inicio
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="payment-response-loading">
            <div className="loading-icon">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <h1>Procesando Pago...</h1>
            <p>Por favor espera mientras confirmamos tu transacción.</p>
          </div>
        );
    }
  };

  return (
    <div className="payment-response">
      <div className="payment-response-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentResponse;
