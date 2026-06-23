def register_user(client, email="tester@example.com", password="password123", name="Test User"):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["access_token"]
    assert data["refresh_token"]
    return data


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_user_registration_and_login(client):
    register_user(client)

    response = client.post(
        "/api/auth/login",
        json={"email": "tester@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["email"] == "tester@example.com"
    assert data["access_token"]
    assert data["refresh_token"]


def test_create_task_requires_authentication(client):
    response = client.post("/api/tasks", json={"title": "No token task"})

    assert response.status_code == 401
    assert response.json()["error"] == "Authentication required"


def test_authenticated_user_can_create_task(client):
    user = register_user(client)

    response = client.post(
        "/api/tasks",
        json={"title": "Write tests", "priority": "High", "tags": ["ci", "api"]},
        headers=auth_headers(user["access_token"]),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["task"]["title"] == "Write tests"
    assert data["task"]["priority"] == "High"
    assert data["task"]["tags"] == ["ci", "api"]


def test_authenticated_user_can_update_task_status(client):
    user = register_user(client)
    created = client.post(
        "/api/tasks",
        json={"title": "Move this task"},
        headers=auth_headers(user["access_token"]),
    ).json()
    task_id = created["task"]["id"]

    response = client.patch(
        f"/api/tasks/{task_id}/status",
        json={"status": "Done"},
        headers=auth_headers(user["access_token"]),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["task"]["status"] == "Done"
    assert data["task"]["completed_at"] is not None


def test_habit_create_and_toggle(client):
    user = register_user(client)
    headers = auth_headers(user["access_token"])

    created = client.post(
        "/api/habits",
        json={"name": "Read", "frequency": "Daily"},
        headers=headers,
    )

    assert created.status_code == 200
    habit = created.json()["habit"]
    assert habit["name"] == "Read"
    assert habit["completed_dates"] == []

    toggled = client.patch(
        f"/api/habits/{habit['id']}/toggle",
        json={"date": "2026-06-23"},
        headers=headers,
    )

    assert toggled.status_code == 200
    data = toggled.json()["habit"]
    assert data["completed_dates"] == ["2026-06-23"]
    assert data["streak"] >= 0
