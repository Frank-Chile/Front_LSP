from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register():
    response = client.post("/register", json={
        "email": "ronald@gmail.com",
        "nombre": "Ronald",
        "telefono": "1234567890",
        "clave": "password123"
    })
    assert response.status_code == 200
    assert response.json() == {"mensaje": "Usuario Registrado"}