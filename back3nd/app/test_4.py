from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register_existing_user():
    # Primero registramos el usuario
    first_response = client.post("/register", json={
        "email": "ronald@gmail.com",
        "nombre": "Ronald",
        "telefono": "1234567890",
        "clave": "password123"
    })
    assert first_response.status_code == 200
    
    # Intentamos registrar el mismo usuario nuevamente
    second_response = client.post("/register", json={
        "email": "ronald@gmail.com",
        "nombre": "Ronald2",  # Cambiado para verificar que es el email el que causa el error
        "telefono": "1234567890",
        "clave": "password123"
    })
    assert second_response.status_code == 400
    assert "El email ya está registrado" in second_response.json()["detail"]