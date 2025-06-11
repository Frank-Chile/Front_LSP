from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_user_info():
    # Primero registramos un usuario para la prueba
    client.post("/register", json={
        "email": "ronald@gmail.com",
        "nombre": "Ronald",
        "telefono": "1234567890",
        "clave": "password123"
    })
    
    # Modificado para usar email en vez de user_email
    response = client.post("/user-info", json={
        "email": "ronald@gmail.com"  # Cambiado de user_email a email
    })
    assert response.status_code == 200
    data = response.json()
    assert data["nombre"] == "Ronald"
    assert "email" in data