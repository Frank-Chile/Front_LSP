from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login_invalid_credentials():
    # Primero creamos un usuario válido
    client.post("/register", json={
        "email": "ronald@gmail.com",
        "nombre": "Ronald",
        "telefono": "1234567890",
        "clave": "password123"
    })
    
    # Intentamos login con credenciales incorrectas
    response = client.post("/login", json={
        "email": "ronald@gmail.com",
        "clave": "wrongpassword"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales incorrectas"