from typing import Dict, Optional
from fastapi import HTTPException
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class PaymentStorageService:
    """
    Servicio para almacenar y gestionar información de pagos
    En un entorno de producción, esto debería usar una base de datos
    """
    
    def __init__(self):
        # Almacenamiento temporal en memoria (usar BD en producción)
        self._payments: Dict[str, Dict] = {}
        self._sessions: Dict[str, Dict] = {}

    def create_payment_session(self, user_email: str, amount: float, plan_type: str) -> str:
        """
        Crea una nueva sesión de pago
        """
        try:
            session_id = str(uuid.uuid4())
            purchase_number = f"LSP{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            session_data = {
                "session_id": session_id,
                "user_email": user_email,
                "amount": amount,
                "plan_type": plan_type,
                "purchase_number": purchase_number,
                "status": "pending",
                "created_at": datetime.now().isoformat(),
                "access_token": None,
                "transaction_token": None
            }
            
            self._sessions[session_id] = session_data
            logger.info(f"Sesión de pago creada: {session_id}")
            
            return session_id
            
        except Exception as e:
            logger.error(f"Error al crear sesión de pago: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def store_access_token(self, session_id: str, access_token: str):
        """
        Almacena el token de acceso para una sesión
        """
        try:
            if session_id not in self._sessions:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
                
            self._sessions[session_id]["access_token"] = access_token
            logger.info(f"Token de acceso almacenado para sesión: {session_id}")
            
        except Exception as e:
            logger.error(f"Error al almacenar token de acceso: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def store_transaction_token(self, session_id: str, transaction_token: str):
        """
        Almacena el token de transacción
        """
        try:
            if session_id not in self._sessions:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
                
            self._sessions[session_id]["transaction_token"] = transaction_token
            self._sessions[session_id]["status"] = "processing"
            logger.info(f"Token de transacción almacenado para sesión: {session_id}")
            
        except Exception as e:
            logger.error(f"Error al almacenar token de transacción: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def get_session_data(self, session_id: str) -> Dict:
        """
        Obtiene los datos de una sesión
        """
        try:
            if session_id not in self._sessions:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
                
            return self._sessions[session_id]
            
        except Exception as e:
            logger.error(f"Error al obtener datos de sesión: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def get_access_token(self, session_id: str) -> str:
        """
        Obtiene el token de acceso de una sesión
        """
        session_data = self.get_session_data(session_id)
        access_token = session_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Token de acceso no válido")
            
        return access_token

    def get_transaction_token(self, session_id: str) -> str:
        """
        Obtiene el token de transacción de una sesión
        """
        session_data = self.get_session_data(session_id)
        transaction_token = session_data.get("transaction_token")
        
        if not transaction_token:
            raise HTTPException(status_code=400, detail="Token de transacción no válido")
            
        return transaction_token

    def get_amount(self, session_id: str) -> float:
        """
        Obtiene el monto de una sesión
        """
        session_data = self.get_session_data(session_id)
        return session_data.get("amount", 0.0)

    def get_purchase_number(self, session_id: str) -> str:
        """
        Obtiene el número de compra de una sesión
        """
        session_data = self.get_session_data(session_id)
        return session_data.get("purchase_number", "")

    def mark_payment_completed(self, session_id: str, authorization_data: Dict):
        """
        Marca un pago como completado
        """
        try:
            if session_id not in self._sessions:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
                
            self._sessions[session_id]["status"] = "completed"
            self._sessions[session_id]["authorization_data"] = authorization_data
            self._sessions[session_id]["completed_at"] = datetime.now().isoformat()
            
            # Mover a pagos completados
            payment_id = str(uuid.uuid4())
            self._payments[payment_id] = self._sessions[session_id].copy()
            
            logger.info(f"Pago completado para sesión: {session_id}")
            
            return payment_id
            
        except Exception as e:
            logger.error(f"Error al completar pago: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def mark_payment_failed(self, session_id: str, error_message: str):
        """
        Marca un pago como fallido
        """
        try:
            if session_id not in self._sessions:
                raise HTTPException(status_code=404, detail="Sesión no encontrada")
                
            self._sessions[session_id]["status"] = "failed"
            self._sessions[session_id]["error_message"] = error_message
            self._sessions[session_id]["failed_at"] = datetime.now().isoformat()
            
            logger.info(f"Pago fallido para sesión: {session_id}")
            
        except Exception as e:
            logger.error(f"Error al marcar pago como fallido: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def get_user_payments(self, user_email: str) -> list:
        """
        Obtiene los pagos de un usuario
        """
        try:
            user_payments = []
            for payment_data in self._payments.values():
                if payment_data.get("user_email") == user_email:
                    user_payments.append({
                        "amount": payment_data.get("amount"),
                        "plan_type": payment_data.get("plan_type"),
                        "status": payment_data.get("status"),
                        "created_at": payment_data.get("created_at"),
                        "completed_at": payment_data.get("completed_at")
                    })
                    
            return user_payments
            
        except Exception as e:
            logger.error(f"Error al obtener pagos del usuario: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
