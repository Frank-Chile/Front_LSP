import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import paymentService from '../services/payments/paymentService';
import './payment_response_screen.css';

const PaymentResponseScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Procesando pago...');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Obtener parámetros de la URL
        const urlStatus = searchParams.get('status');
        const urlToken = searchParams.get('token');
        
        console.log('PaymentResponse - Status:', urlStatus);
        console.log('PaymentResponse - Token:', urlToken);

        // Consultar el estado del pago desde el backend
        const paymentStatus = await paymentService.getPaymentStatus();
        console.log('Payment Status from backend:', paymentStatus);        if (paymentStatus.success && paymentStatus.transaction_token) {
          setStatus('success');
          setMessage('¡Pago procesado exitosamente!');
          setPaymentData({
            transaction_token: paymentStatus.transaction_token,
            amount: paymentStatus.amount,
            status: paymentStatus.status,
            payment_method: paymentStatus.payment_method || 'Visa/Mastercard',
            currency: paymentStatus.currency || 'PEN',
            plan_type: paymentStatus.plan_type || 'premium',
            plan_name: paymentStatus.plan_name || 'Plan Premium',
            reference_number: paymentStatus.reference_number || paymentStatus.transaction_token?.slice(-8),
            processed_at: paymentStatus.processed_at || new Date().toISOString(),
            timestamp: new Date().toLocaleString('es-PE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          });
          
          // Guardar el token de transacción en el usuario
          await saveTransactionToUser(paymentStatus.transaction_token, paymentStatus.amount);
          } else if (urlStatus === 'error') {
          setStatus('error');
          setMessage('Hubo un error al procesar el pago');
        } else {
          setStatus('pending');
          setMessage('Verificando estado del pago...');
          
          // Intentar nuevamente en 2 segundos
          setTimeout(() => {
            checkPaymentStatus();
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setMessage('Error al verificar el estado del pago');
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  const saveTransactionToUser = async (transactionToken, amount) => {
    try {
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) {
        console.warn('No se encontró email del usuario para guardar la transacción');
        return;
      }

      // Aquí harías la llamada al backend para guardar la transacción
      const response = await fetch('http://localhost:8000/api/users/save-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          transaction_token: transactionToken,
          amount: amount,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        console.log('✅ Transacción guardada en el usuario');
      } else {
        console.error('❌ Error guardando transacción');
      }
    } catch (error) {
      console.error('Error saving transaction to user:', error);
    }
  };

  const handleGoToMain = () => {
    navigate('/main');
  };

  const handleGoToPricing = () => {
    navigate('/pricing');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="payment-response-container">
      <div className="payment-response-card">
        <div className={`payment-status-icon ${status}`}>
          {status === 'success' && <span>✅</span>}
          {status === 'error' && <span>❌</span>}
          {status === 'loading' && <span>⏳</span>}
          {status === 'pending' && <span>🔄</span>}
        </div>
        
        <h2 className="payment-response-title">
          {status === 'success' && 'Pago Exitoso'}
          {status === 'error' && 'Error en el Pago'}
          {status === 'loading' && 'Procesando...'}
          {status === 'pending' && 'Verificando...'}
        </h2>
        
        <p className="payment-response-message">{message}</p>
          {paymentData && status === 'success' && (
          <div className="payment-details">
            <h3>Detalles de la Transacción</h3>
            
            <div className="payment-detail-item">
              <span className="label">Estado:</span>
              <span className="value success">✅ Completado</span>
            </div>
            
            <div className="payment-detail-item">
              <span className="label">Plan Adquirido:</span>
              <span className="value plan-name">{paymentData.plan_name}</span>
            </div>
            
            <div className="payment-detail-item">
              <span className="label">Monto:</span>
              <span className="value amount">{paymentData.currency} {paymentData.amount?.toFixed(2)}</span>
            </div>
            
            <div className="payment-detail-item">
              <span className="label">Método de Pago:</span>
              <span className="value">{paymentData.payment_method}</span>
            </div>
            
            <div className="payment-detail-item">
              <span className="label">Fecha y Hora:</span>
              <span className="value">{paymentData.timestamp}</span>
            </div>
            
            <div className="payment-detail-item">
              <span className="label">Número de Referencia:</span>
              <span className="value reference">{paymentData.reference_number}</span>
            </div>
            
            <div className="payment-detail-item">
              <span className="label">Token de Transacción:</span>
              <span className="value token">{paymentData.transaction_token}</span>
            </div>
          </div>
        )}
        
        <div className="payment-response-actions">
          {status === 'success' && (
            <>
              <button className="btn-primary" onClick={handleGoToMain}>
                Ir al Menú Principal
              </button>
              <button className="btn-secondary" onClick={handleGoToPricing}>
                Ver Planes
              </button>
            </>
          )}
          {status === 'error' && (
            <>
              <button className="btn-primary" onClick={handleGoToPricing}>
                Intentar Nuevamente
              </button>
              <button className="btn-secondary" onClick={handleGoHome}>
                Ir al Inicio
              </button>
            </>
          )}
          {(status === 'loading' || status === 'pending') && (
            <button className="btn-secondary" onClick={handleGoHome} disabled>
              Esperando...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentResponseScreen;
