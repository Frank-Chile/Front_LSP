import React, { useState, useEffect } from 'react';
import paymentService from '../../services/payments/paymentService';
import './PaymentHistory.css';

const PaymentHistory = ({ userEmail }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userEmail) {
      loadPaymentHistory();
    }
  }, [userEmail]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userPayments = await paymentService.getUserPayments(userEmail);
      setPayments(userPayments);
    } catch (error) {
      console.error('Error al cargar historial de pagos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { class: 'status-completed', icon: 'fa-check-circle', text: 'Completado' },
      pending: { class: 'status-pending', icon: 'fa-clock', text: 'Pendiente' },
      failed: { class: 'status-failed', icon: 'fa-times-circle', text: 'Fallido' },
      processing: { class: 'status-processing', icon: 'fa-spinner fa-spin', text: 'Procesando' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`payment-status ${config.class}`}>
        <i className={`fas ${config.icon}`}></i>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="payment-history-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando historial de pagos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-history-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Error al cargar el historial: {error}</p>
        <button onClick={loadPaymentHistory} className="retry-button">
          <i className="fas fa-redo"></i>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="payment-history">
      <div className="payment-history-header">
        <h2>
          <i className="fas fa-history"></i>
          Historial de Pagos
        </h2>
        <button onClick={loadPaymentHistory} className="refresh-button">
          <i className="fas fa-sync-alt"></i>
          Actualizar
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="no-payments">
          <i className="fas fa-receipt"></i>
          <h3>No hay pagos registrados</h3>
          <p>Cuando realices tu primer pago, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="payments-list">
          {payments.map((payment, index) => (
            <div key={index} className="payment-card">
              <div className="payment-card-header">
                <div className="payment-plan">
                  <i className="fas fa-star"></i>
                  <span>{payment.plan_type}</span>
                </div>
                {getStatusBadge(payment.status)}
              </div>
              
              <div className="payment-card-body">
                <div className="payment-amount">
                  <i className="fas fa-dollar-sign"></i>
                  <span>S/. {payment.amount?.toFixed(2) || '0.00'}</span>
                </div>
                
                <div className="payment-dates">
                  <div className="payment-date">
                    <i className="fas fa-calendar-plus"></i>
                    <div>
                      <small>Creado</small>
                      <span>{formatDate(payment.created_at)}</span>
                    </div>
                  </div>
                  
                  {payment.completed_at && (
                    <div className="payment-date">
                      <i className="fas fa-calendar-check"></i>
                      <div>
                        <small>Completado</small>
                        <span>{formatDate(payment.completed_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
