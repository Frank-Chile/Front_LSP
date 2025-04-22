from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    nombre: str
    telefono: str
    clave: str

class UserLogin(BaseModel):
    email: str
    clave: str