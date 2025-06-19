from fastapi import FastAPI, Depends
from database import Base, engine, get_db
from auth import router as auth_router
from video_processing import router as video_router
from payments.routes_simple import router as payment_router
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
from models import User
from schemas import UserTransactionRequest
from datetime import datetime

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LSP Backend", description="Backend para reconocimiento de lenguaje de señas")

# CORS más permisivo para WebSockets y desarrollo
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],  
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"], 
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth_router)
app.include_router(video_router, prefix="/video")
app.include_router(payment_router)

@app.on_event("startup")
async def startup_event():
    print("#### BACKEND: Servidor iniciado")
    print("#### BACKEND: WebSocket disponible en: ws://localhost:8000/video/realtime-recognition")
    print("#### BACKEND: API disponible en: http://localhost:8000")
    print("#### BACKEND: Pagos disponibles en: http://localhost:8000/payments")

@app.post("/api/users/save-transaction")
async def save_user_transaction(
    transaction_data: UserTransactionRequest,
    db: Session = Depends(get_db)
):
    """
    Guarda los datos de transacción en el usuario
    """
    try:
        print(f"GUARDAR TRANSACCIÓN: {transaction_data.email}")
        print(f"Token: {transaction_data.transaction_token}")
        print(f"Monto: {transaction_data.amount}")
        
        # Buscar el usuario por email
        user = db.query(User).filter(User.email == transaction_data.email).first()
        
        if not user:
            print(f"Usuario no encontrado: {transaction_data.email}")
            return {"success": False, "message": "Usuario no encontrado"}
        
        # Actualizar los datos de transacción
        user.last_transaction_token = transaction_data.transaction_token
        user.last_payment_amount = transaction_data.amount
        user.last_payment_date = datetime.fromisoformat(transaction_data.timestamp.replace('Z', '+00:00'))
        
        # Determinar el plan según el monto
        if transaction_data.amount >= 50:
            user.premium_plan = "corporate"
        elif transaction_data.amount >= 20:
            user.premium_plan = "premium"
        else:
            user.premium_plan = "basic"
        
        db.commit()
        db.refresh(user)
        
        print(f"Transacción guardada para usuario: {user.email}")
        print(f"Plan asignado: {user.premium_plan}")
        
        return {
            "success": True,
            "message": "Transacción guardada exitosamente",
            "plan": user.premium_plan
        }
        
    except Exception as e:
        print(f"Error guardando transacción: {e}")
        db.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)