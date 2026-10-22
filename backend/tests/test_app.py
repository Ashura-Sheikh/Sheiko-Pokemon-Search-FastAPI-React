from fastapi.testclient import TestClient

from app.app import app

client = TestClient(app)


def test_hello_sheiko_returns_message():
    response = client.get("/hello-sheiko")
    assert response.status_code == 200
    assert "message" in response.json()


def test_docs_page_loads():
    response = client.get("/docs")
    assert response.status_code == 200
