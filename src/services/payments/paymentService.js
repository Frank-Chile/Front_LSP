import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/niubiz';

/**
 * PaymentRequest structure:
 * {
 *   amount: number,
 *   plan_type: string,
 *   user_email: string
 * }
 */

/**
 * PaymentSession structure:
 * {
 *   success: boolean,
 *   session_id: string,
 *   session_token: string,
 *   purchase_number: string,
 *   merchant_id: string
 * }
 */

class PaymentService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  /**
   * Crea una nueva sesión de pago (simplificada como el ejemplo original)
   */
  async generateSessionToken(amount) {
    try {
      console.log('Enviando request para generar session token:', { amount });
      const response = await this.axiosInstance.post('/generate-session-token', { amount });
      console.log('Respuesta del servidor:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al crear sesión de pago:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(
        error.response?.data?.detail || 'Error al crear sesión de pago'
      );
    }
  }
  /**
   * Configura VisanetCheckout con los parámetros necesarios (según documentación oficial)
   */
  configureVisanetCheckout(sessionToken, amount, onComplete) {
    const purchaseNumber = `LSP${Date.now()}`;
    console.log('Configurando VisanetCheckout con:', {
      sessionToken,
      amount,
      purchaseNumber
    });

    return {
      // Parámetros obligatorios según documentación
      action: `${API_BASE_URL}/response-form`,
      channel: 'web',
      merchantid: '456879852',
      sessiontoken: sessionToken,  // Cambio de 'sessionkey' a 'sessiontoken'
      purchasenumber: purchaseNumber,
      amount: parseFloat(amount.toString()),
      
      // Parámetros opcionales pero recomendados
      expirationminutes: '5',
      timeouturl: `${API_BASE_URL}/timeout?id=${purchaseNumber}`,
      merchantlogo: 'https://via.placeholder.com/187x40/6246ea/white?text=LSP',
      merchantname: 'LSP - Lenguaje de Señas Peruano',
      buttonsize: 'DEFAULT',
      buttoncolor: 'NAVY',
      formbuttoncolor: '#6246ea',
      showamount: 'TRUE',
      
      // Callback para cuando se complete el pago
      complete: (params) => {
        console.log('Pago completado desde VisanetCheckout:', params);
        if (onComplete) {
          onComplete(params);
        }
      },
    };
  }
  /**
   * Consulta el estado del pago
   */
  async getPaymentStatus() {
    try {
      console.log('Consultando estado del pago...');
      const response = await this.axiosInstance.get('/payment-status');
      console.log('Estado del pago:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al consultar estado del pago:', error);
      throw new Error(
        error.response?.data?.detail || 'Error al consultar estado del pago'
      );
    }
  }
}

// Singleton instance
const paymentService = new PaymentService();
export default paymentService;
