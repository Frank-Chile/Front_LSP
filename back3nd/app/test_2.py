from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login():
    # Primero registramos un usuario para la prueba
    client.post("/register", json={
        "email": "ronald@gmail.com",
        "nombre": "Ronald",
        "telefono": "1234567890",
        "clave": "password123"
    })
    
    # Luego intentamos hacer login
    response = client.post("/login", json={
        "email": "ronald@gmail.com",
        "clave": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["mensaje"] == "Login exitoso"
    assert data["nombre"] == "Ronald"