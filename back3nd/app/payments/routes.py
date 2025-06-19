from fastapi import APIRouter, Depends, HTTPException, status, Form, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import logging

# Import from parent modules
import sys
sys.path.insert(0, '..')
from database import get_db
from models import User

from .niubiz_service import NiubizService
from .storage_service import PaymentStorageService

logger = logging.getLogger(__name__)

# Crear router para pagos
router = APIRouter(prefix="/payments", tags=["payments"])

# Inicializar servicios
niubiz_service = NiubizService()
payment_storage = PaymentStorageService()

# Modelos Pydantic
class PaymentRequest(BaseModel):
    amount: float
    plan_type: str
    user_email: str

class AuthorizationRequest(BaseModel):
    session_id: str

@router.post("/create-session")
async def create_payment_session(
    request: PaymentRequest, 
    db: Session = Depends(get_db)
):
    """
    Crea una nueva sesión de pago
    """
    try:
        # Verificar que el usuario existe
        user = db.query(User).filter(User.email == request.user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        # Crear sesión de pago
        session_id = payment_storage.create_payment_session(
            user_email=request.user_email,
            amount=request.amount,
            plan_type=request.plan_type
        )

        # Generar token de acceso
        access_token = niubiz_service.generate_access_token()
        payment_storage.store_access_token(session_id, access_token)

        # Generar token de sesión
        purchase_number = payment_storage.get_purchase_number(session_id)
        session_token = niubiz_service.generate_session_token(
            access_token=access_token,
            amount=request.amount,
            purchase_number=purchase_number
        )

        logger.info(f"Sesión de pago creada exitosamente: {session_id}")

        return {
            "success": True,
            "session_id": session_id,
            "session_token": session_token,
            "purchase_number": purchase_number,
            "merchant_id": niubiz_service.merchant_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear sesión de pago: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )

@router.post("/niubiz/response-form")
async def handle_niubiz_response(
    request: Request,
    response: Response,
    channel: str = Form(...),
    transaction_token: Optional[str] = Form(None),
    customer_email: Optional[str] = Form(None)
):
    """
    Maneja la respuesta del formulario de Niubiz
    """
    try:
        logger.info(f"Respuesta de Niubiz recibida - Channel: {channel}")
        
        if channel == "web" and transaction_token:
            # Buscar la sesión correspondiente (simplificado para demo)
            # En producción, deberías asociar mejor la sesión con la transacción
            logger.info(f"Transaction Token recibido: {transaction_token}")
            logger.info(f"Customer Email: {customer_email}")
            
            # Redirigir a frontend con parámetros
            redirect_url = f"http://localhost:5173/payment-response?status=success&token={transaction_token}"
            return RedirectResponse(url=redirect_url)
        else:
            # Pago fallido o cancelado
            redirect_url = "http://localhost:5173/payment-response?status=failed"
            return RedirectResponse(url=redirect_url)
            
    except Exception as e:
        logger.error(f"Error al procesar respuesta de Niubiz: {str(e)}")
        return RedirectResponse(url="http://localhost:5173/payment-response?status=error")

@router.post("/authorize")
async def authorize_payment(request: AuthorizationRequest):
    """
    Autoriza un pago después de recibir el token de transacción
    """
    try:
        # Obtener datos de la sesión
        session_data = payment_storage.get_session_data(request.session_id)
        
        # Preparar orden para autorización
        order = {
            "tokenId": payment_storage.get_transaction_token(request.session_id),
            "purchaseNumber": payment_storage.get_purchase_number(request.session_id),
            "amount": payment_storage.get_amount(request.session_id),
            "currency": "PEN"
        }

        # Autorizar pago
        access_token = payment_storage.get_access_token(request.session_id)
        authorization_response = niubiz_service.generate_authorization_token(
            access_token=access_token,
            order=order
        )

        # Marcar pago como completado
        payment_id = payment_storage.mark_payment_completed(
            request.session_id, 
            authorization_response
        )

        logger.info(f"Pago autorizado exitosamente: {payment_id}")

        return {
            "success": True,
            "payment_id": payment_id,
            "authorization_data": authorization_response
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al autorizar pago: {str(e)}")
        payment_storage.mark_payment_failed(request.session_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al autorizar pago: {str(e)}"
        )

@router.get("/timeout")
async def handle_timeout(purchase_number: str):
    """
    Maneja el timeout de pagos
    """
    logger.info(f"Timeout para compra: {purchase_number}")
    return {
        "success": False,
        "message": f"Tiempo de espera agotado para la compra {purchase_number}"
    }

@router.get("/user-payments/{user_email}")
async def get_user_payments(user_email: str, db: Session = Depends(get_db)):
    """
    Obtiene el historial de pagos de un usuario
    """
    try:
        # Verificar que el usuario existe
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        # Obtener pagos del usuario
        payments = payment_storage.get_user_payments(user_email)
        
        return {
            "success": True,
            "payments": payments
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener pagos del usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
