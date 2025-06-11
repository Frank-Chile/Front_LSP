from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_user_info_nonexistent_user():
    response = client.post("/user-info", json={
        "email": "frank2025@usil.pe"  # Cambiado de user_email a email
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuario no encontrado"