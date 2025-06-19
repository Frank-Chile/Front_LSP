from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    email = Column(String, unique=True, index=True)
    nombre = Column(String)
    telefono = Column(String)
    clave = Column(String)
    
    # Campos para transacciones de pago
    last_transaction_token = Column(String, nullable=True)
    last_payment_amount = Column(Float, nullable=True)
    last_payment_date = Column(DateTime(timezone=True), nullable=True)
    premium_plan = Column(String, nullable=True)  # "premium", "empresarial",libre