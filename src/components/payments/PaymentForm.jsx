import React, { useState, useEffect } from 'react';
import paymentService from '../../services/payments/paymentService';
import './PaymentForm.css';

const PaymentForm = ({ amount, planType, onPaymentComplete, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Escuchar mensajes del iframe de pago
    const handleMessage = async (event) => {
      console.log('Mensaje recibido de Niubiz:', event.data);
      
      if (event.data.type === 'PAYMENT_COMPLETE') {
        console.log('Pago completado via postMessage');
        setLoading(false);
        
        if (event.data.success) {
          // Consultar el estado del pago desde el backend
          try {
            const paymentStatus = await paymentService.getPaymentStatus();
            console.log('Estado final del pago:', paymentStatus);
            
            if (onPaymentComplete) {
              onPaymentComplete({
                success: true,
                payment_status: paymentStatus,
                transaction_token: event.data.transaction_token,
                customer_email: event.data.customer_email,
                amount: amount,
                plan_type: planType
              });
            }
          } catch (error) {
            console.error('Error al consultar estado:', error);
            if (onPaymentError) {
              onPaymentError(error);
            }
          }
        } else {
          if (onPaymentError) {
            onPaymentError(new Error('Pago no completado'));
          }
        }
      } else if (event.data.type === 'PAYMENT_ERROR') {
        console.log('Error en pago via postMessage');
        setLoading(false);
        
        if (onPaymentError) {
          onPaymentError(new Error(event.data.error || 'Error en el pago'));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [amount, planType, onPaymentComplete, onPaymentError]);const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Iniciando proceso de pago para:', { amount, planType });

      // Generar token de sesión directamente
      const sessionResponse = await paymentService.generateSessionToken(amount);
      console.log('Token de sesión obtenido:', sessionResponse);
      
      if (!sessionResponse.sessionToken) {
        throw new Error('No se pudo obtener el token de sesión');
      }

      // Verificar que VisanetCheckout esté disponible
      if (!window.VisanetCheckout) {
        throw new Error(
          'VisanetCheckout no está disponible. Asegúrate de que el script esté cargado correctamente.'
        );
      }

      console.log('VisanetCheckout está disponible');

      // Configurar y abrir VisanetCheckout
      const checkoutConfig = paymentService.configureVisanetCheckout(
        sessionResponse.sessionToken,
        amount,
        (params) => {
          console.log('Pago completado desde checkout:', params);
          if (onPaymentComplete) {
            onPaymentComplete({
              success: true,
              checkout_params: params,
              amount: amount,
              plan_type: planType
            });
          }
        }
      );

      console.log('Configuración de checkout:', checkoutConfig);

      window.VisanetCheckout.configure(checkoutConfig);
      console.log('VisanetCheckout configurado, abriendo modal...');
      
      window.VisanetCheckout.open();
      console.log('VisanetCheckout modal abierto');

    } catch (error) {
      console.error('Error al procesar el pago:', error);
      setError(error.message);
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form">
      <div className="payment-form-header">
        <h2>Realizar Pago</h2>
        <p className="payment-plan">Plan: <span>{planType}</span></p>
        <p className="payment-amount">Monto: <span>S/. {amount.toFixed(2)}</span></p>
      </div>

      {error && (
        <div className="payment-error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      <div className="payment-form-body">
        <div className="payment-info">
          <h3>Información del Pago</h3>
          <ul>
            <li>Pago seguro con Visa/Mastercard</li>
            <li>Transacción protegida SSL</li>
            <li>Confirmación inmediata</li>
            <li>Soporte 24/7</li>
          </ul>
        </div>

        <div className="payment-actions">
          <button 
            className="payment-button"
            onClick={handlePayment} 
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Procesando...
              </>
            ) : (
              <>
                <i className="fas fa-credit-card"></i>
                Pagar S/. {amount.toFixed(2)}
              </>
            )}
          </button>        </div>
      </div>

      <div className="payment-form-footer">
        <p className="payment-secure">
          <i className="fas fa-lock"></i>
          Tus datos están protegidos con encriptación SSL de 256 bits
        </p>
      </div>
    </div>
  );
};

export default PaymentForm;
