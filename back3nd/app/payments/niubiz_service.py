from fastapi import HTTPException
import requests
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class NiubizService:
    """
    Servicio para integración con Niubiz (Visa eCommerce)
    Maneja autenticación, generación de tokens y procesamiento de pagos
    """
    
    def __init__(self):
        self.session = requests.Session()
        # URLs de desarrollo (sandbox)
        self.base_url = "https://apisandbox.vnforappstest.com"
        self.merchant_id = "456879852"
        self.api_user = "integraciones@niubiz.com.pe"
        self.api_password = "_7d6L$2*56"
        
    def generate_access_token(self) -> str:
        """
        Genera un token de acceso para autenticación con Niubiz
        """
        try:
            auth_url = f"{self.base_url}/api.authorization/v3/authorization/ecommerce/{self.merchant_id}"
            
            headers = {
                "Content-Type": "application/json"
            }
            
            request_body = {
                "username": self.api_user,
                "password": self.api_password
            }
            
            response = self.session.post(auth_url, json=request_body, headers=headers)
            response.raise_for_status()
            
            access_token = response.text.strip()
            logger.info("Token de acceso generado exitosamente")
            return access_token
            
        except requests.RequestException as e:
            logger.error(f"Error al generar token de acceso: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error de autenticación: {str(e)}")
        except Exception as e:
            logger.error(f"Error inesperado al generar token: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def generate_session_token(self, access_token: str, amount: float, purchase_number: str) -> str:
        """
        Genera un token de sesión para procesar el pago
        """
        try:
            session_url = f"{self.base_url}/api.ecommerce/v2/ecommerce/token/session/{self.merchant_id}"
            
            headers = {
                "Authorization": access_token,
                "Content-Type": "application/json"
            }

            request_body = {
                "channel": "web",
                "amount": amount,
                "antifraud": {
                    "clientIp": "127.0.0.1",
                    "merchantDefineData": {
                        "MDD4": "integraciones@niubiz.com.pe",
                        "MDD32": purchase_number,
                        "MDD75": "Registrado",
                        "MDD77": 458
                    }
                },
                "dataMap": {
                    "cardholderCity": "Lima",
                    "cardholderCountry": "PE",
                    "cardholderAddress": "Av Jose Pardo 831",
                    "cardholderPostalCode": "15074",
                    "cardholderState": "LIM",
                    "cardholderPhoneNumber": "987654321"
                }
            }

            response = self.session.post(session_url, json=request_body, headers=headers)
            response.raise_for_status()
            
            response_data = response.json()
            session_key = response_data.get("sessionKey")
            
            if not session_key:
                raise HTTPException(status_code=500, detail="No se pudo obtener el token de sesión")
                
            logger.info("Token de sesión generado exitosamente")
            return session_key
            
        except requests.RequestException as e:
            logger.error(f"Error al generar token de sesión: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error al generar sesión: {str(e)}")
        except Exception as e:
            logger.error(f"Error inesperado al generar sesión: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def generate_authorization_token(self, access_token: str, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Genera un token de autorización para confirmar el pago
        """
        try:
            authorization_url = f"{self.base_url}/api.authorization/v3/authorization/ecommerce/{self.merchant_id}"
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": access_token
            }

            request_body = {
                "channel": "web",
                "captureType": "manual",
                "countable": True,
                "order": order
            }

            response = self.session.post(authorization_url, json=request_body, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            logger.info("Token de autorización generado exitosamente")
            return result
            
        except requests.RequestException as e:
            logger.error(f"Error al generar token de autorización: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error de autorización: {str(e)}")
        except Exception as e:
            logger.error(f"Error inesperado al autorizar: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def validate_payment_response(self, transaction_token: Optional[str], channel: str) -> bool:
        """
        Valida la respuesta del pago
        """
        try:
            if channel != "web":
                return False
                
            if not transaction_token:
                return False

            logger.info(f"Pago validado para token: {transaction_token}")
            return True
            
        except Exception as e:
            logger.error(f"Error al validar pago: {str(e)}")
            return False
