from fastapi import APIRouter, Form, HTTPException, Response, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from typing import Optional, Dict
from pydantic import BaseModel
import requests # type: ignore
import logging
import base64
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/niubiz", tags=["niubiz"])

# Almacenmiento
class SimpleTokenStorage:
    def __init__(self):
        self.access_token = None
        self.transaction_token = None
        self.amount = None
        self.purchase_number = None

    def store_amount(self, amount: float):
        self.amount = amount

    def store_access_token(self, access_token: str):
        self.access_token = access_token

    def store_transaction_token(self, transaction_token: str):
        self.transaction_token = transaction_token

    def get_access_token(self):
        return self.access_token

    def get_transaction_token(self):
        return self.transaction_token

    def get_amount(self):
        return self.amount

# Servicio Niubiz
class SimpleNiubizService:
    def __init__(self):
        self.base_url = "https://apisandbox.vnforappstest.com"
        self.merchant_id = "456879852"
        self.api_user = "integraciones@niubiz.com.pe"
        self.api_password = "_7z3@8fF"

    def generate_access_token(self):
        try:
            print("🔐 NIUBIZ SERVICE: Generando access token...")
            auth_url = f"{self.base_url}/api.security/v1/security"
            
            credentials = f"{self.api_user}:{self.api_password}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            print(f"CREDENTIALS: {credentials}")
            print(f"ENCODED CREDENTIALS: {encoded_credentials}")
            
            headers = {
                "Authorization": f"Basic {encoded_credentials}"
            }
            
            print(f"AUTH URL: {auth_url}")
            
            response = requests.get(auth_url, headers=headers)
            response.raise_for_status()
            
            access_token = response.text.strip()
            print(f"ACCESS TOKEN OBTENIDO: {access_token}")
            return access_token
        except Exception as e:
            print(f"ERROR EN ACCESS TOKEN: {e}")
            logger.error(f"Error generating access token: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    def generate_session_token(self, access_token: str, amount: float):
        try:
            print(f"NIUBIZ SERVICE: Generando session token para monto: {amount}")
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
                        "MDD32": f"LSP{int(amount)}",
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

            print(f"SESSION URL: {session_url}")
            print(f"SESSION REQUEST BODY: {request_body}")

            response = requests.post(session_url, json=request_body, headers=headers)
            response.raise_for_status()
            
            session_key = response.json().get("sessionKey")
            print(f"SESSION KEY OBTENIDO: {session_key}")
            return session_key
        except Exception as e:
            print(f"ERROR EN SESSION TOKEN: {e}")
            logger.error(f"Error generating session token: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Instancias globales
token_storage = SimpleTokenStorage()
niubiz_service = SimpleNiubizService()

# Modelos
class SessionTokenRequest(BaseModel):
    amount: float

@router.post("/generate-session-token")
async def generate_session_token(request: SessionTokenRequest):
    try:
        print(f"GENERAR SESSION TOKEN: Iniciando proceso para monto: {request.amount}")
        
        # Store amount
        token_storage.store_amount(request.amount)
        print(f"Monto almacenado: {request.amount}")
        
        # Generate access token
        print("Generando token de acceso...")
        access_token = niubiz_service.generate_access_token()
        token_storage.store_access_token(access_token)
        print(f"ACCESS TOKEN generado: {access_token}")
        
        # Generate session token
        print("Generando token de sesión...")
        session_token = niubiz_service.generate_session_token(access_token, request.amount)
        print(f"SESSION TOKEN generado: {session_token}")
        
        return {"sessionToken": session_token}
    except Exception as e:
        print(f"ERROR GENERANDO SESSION TOKEN: {e}")
        logger.error(f"Error in generate_session_token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/response-form")
async def handle_form_response(request: Request):
    try:
        print(f"NIUBIZ RESPONSE FORM: Respuesta del formulario recibida")
        
        # Capturar todos los headers
        print("HEADERS:")
        for name, value in request.headers.items():
            print(f"  {name}: {value}")
        
        content_type = request.headers.get("content-type", "")

        body = await request.body()

        transaction_token = None
        customer_email = None
        channel = "web"
        
        try:
            form_data = await request.form()
            print(f"FORM DATA: {dict(form_data)}")
            
            # Extraer los campos comunes
            channel = form_data.get("channel") or "web"
            transaction_token = form_data.get("transactionToken") or form_data.get("transaction_token")
            customer_email = form_data.get("customerEmail") or form_data.get("customer_email")
            
            print(f"CHANNEL: {channel}")
            print(f"TRANSACTION TOKEN: {transaction_token}")
            print(f"CUSTOMER EMAIL: {customer_email}")
            
            # debug
            print("TODOS LOS CAMPOS DEL FORMULARIO:")
            for key, value in form_data.items():
                print(f"  {key}: {value}")
                
        except Exception as form_error:
            print(f"Error parseando form data: {form_error}")
        
        # prsear como query param
        query_params = dict(request.query_params)
        if query_params:
            print(f"🔗 QUERY PARAMS: {query_params}")
            if not transaction_token:
                transaction_token = query_params.get("transactionToken") or query_params.get("transaction_token")
                customer_email = query_params.get("customerEmail") or query_params.get("customer_email")
                channel = query_params.get("channel", "web")
        
        print(f"✅ VALORES FINALES:")
        print(f"  CHANNEL: {channel}")
        print(f"  TRANSACTION TOKEN: {transaction_token}")
        print(f"  CUSTOMER EMAIL: {customer_email}")
        
        if channel == "web" and transaction_token:
            # Store transaction token
            token_storage.store_transaction_token(transaction_token)
            print(f"Transaction Token: {transaction_token}")
            print(f"Customer Email: {customer_email}")
            print(f"💾 Token de transacción almacenado exitosamente")
        else:
            print("⚠️ WARNING: No se recibió transaction_token válido")
            
        # Devolver HTML que cierre el modal
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Procesando pago...</title>
        </head>
        <body>
            <script>
                // Comunicar con la ventana padre (el frontend principal)
                if (window.parent && window.parent !== window) {{
                    window.parent.postMessage({{
                        type: 'PAYMENT_COMPLETE',
                        success: {str(bool(transaction_token)).lower()},
                        transaction_token: '{transaction_token or ''}',
                        customer_email: '{customer_email or ''}',
                        channel: '{channel or 'web'}'
                    }}, '*');
                }}
                
                // También intentar cerrar la ventana/modal
                setTimeout(() => {{
                    window.close();
                }}, 1000);
                
                // Redirigir como fallback
                setTimeout(() => {{
                    window.location.href = 'http://localhost:5173/response?status=success&token={transaction_token or ''}';
                }}, 2000);
            </script>
            <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                <h2>{'✅ Pago Completado' if transaction_token else '⏳ Procesando...'}</h2>
                <p>{'Redirigiendo...' if transaction_token else 'Validando información...'}</p>
                <p><small>Transaction: {transaction_token or 'N/A'}</small></p>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        print(f"ERROR EN RESPONSE FORM: {e}")
        logger.error(f"Error in response form: {e}")
        
        # HTML de error
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error en el pago</title>
        </head>
        <body>
            <script>
                if (window.parent && window.parent !== window) {{
                    window.parent.postMessage({{
                        type: 'PAYMENT_ERROR',
                        success: false,
                        error: '{str(e)}'
                    }}, '*');
                }}
                setTimeout(() => {{
                    window.location.href = 'http://localhost:5173/error';
                }}, 2000);
            </script>
            <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                <h2>❌ Error en el Pago</h2>
                <p>Redirigiendo...</p>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=error_html)

@router.get("/payment-status")
async def get_payment_status():
    """
    Obtiene el estado del último pago procesado con detalles completos
    """
    try:
        print(f"CONSULTA STATUS: Verificando estado del pago")
        
        access_token = token_storage.get_access_token()
        transaction_token = token_storage.get_transaction_token()
        amount = token_storage.get_amount()
        
        print(f"ACCESS TOKEN: {access_token[:50] if access_token else 'None'}...")
        print(f"TRANSACTION TOKEN: {transaction_token}")
        print(f"AMOUNT: {amount}")
        
        if transaction_token:
            # Determinar el plan según el monto
            plan_type = "basic"
            plan_name = "Plan Básico"
            if amount and amount >= 50:
                plan_type = "corporate"
                plan_name = "Plan Corporativo"
            elif amount and amount >= 20:
                plan_type = "premium"
                plan_name = "Plan Premium"
            
            return {
                "success": True,
                "transaction_token": transaction_token,
                "amount": amount,
                "status": "completed",
                "message": "Pago procesado exitosamente",
                "payment_method": "Visa/Mastercard",
                "currency": "PEN",
                "plan_type": plan_type,
                "plan_name": plan_name,
                "processed_at": datetime.now().isoformat(),
                "reference_number": transaction_token[-8:] if transaction_token else None
            }
        else:
            return {
                "success": False,
                "status": "pending",
                "message": "Pago aún no completado",
                "amount": amount
            }
    except Exception as e:
        print(f"ERROR EN PAYMENT STATUS: {e}")
        return {
            "success": False,
            "status": "error",
            "message": str(e)
        }

@router.get("/timeout")
async def handle_timeout(id: str):
    """
    Maneja timeout (igual que en el ejemplo original)
    """
    print(f"TIMEOUT para purchase ID: {id}")
    return {"message": f"Timeout for purchase {id}"}

@router.get("/test")
async def test_payments():
    """
    Endpoint de prueba para verificar que el módulo de pagos funciona
    """
    return {
        "message": "Módulo de pagos funcionando correctamente",
        "version": "1.0.0",
        "status": "active"
    }
