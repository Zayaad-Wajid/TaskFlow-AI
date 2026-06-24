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
    registered = register_user(client)
    assert registered["user"]["email_reminders_enabled"] is True

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


def test_user_can_disable_email_reminders(client):
    user = register_user(client)

    response = client.patch(
        "/api/auth/settings",
        json={"email_reminders_enabled": False},
        headers=auth_headers(user["access_token"]),
    )

    assert response.status_code == 200
    assert response.json()["user"]["email_reminders_enabled"] is False


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


def test_tasks_support_backend_filtering_and_pagination(client):
    user = register_user(client)
    headers = auth_headers(user["access_token"])
    client.post(
        "/api/tasks",
        json={"title": "Write API docs", "description": "Backend filtering", "priority": "High", "tags": ["docs"]},
        headers=headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Polish UI", "description": "Frontend pass", "priority": "Low", "tags": ["design"]},
        headers=headers,
    )

    response = client.get(
        "/api/tasks",
        params={"search": "api", "priority": "High", "tags": "docs", "page": 1, "page_size": 1},
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["page_size"] == 1
    assert data["items"][0]["title"] == "Write API docs"


def test_tasks_can_be_exported_with_current_filters(client):
    user = register_user(client)
    headers = auth_headers(user["access_token"])
    client.post(
        "/api/tasks",
        json={"title": "Export me", "description": "Matching task", "priority": "High", "tags": ["report"]},
        headers=headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Leave out", "priority": "Low"},
        headers=headers,
    )

    csv_response = client.get(
        "/api/tasks/export",
        params={"format": "csv", "priority": "High", "tags": "report"},
        headers=headers,
    )

    assert csv_response.status_code == 200
    assert csv_response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in csv_response.headers["content-disposition"]
    assert "title,description,status,priority,due_date,tags,created_at" in csv_response.text
    assert "Export me" in csv_response.text
    assert "Leave out" not in csv_response.text

    json_response = client.get(
        "/api/tasks/export",
        params={"format": "json", "search": "Export me"},
        headers=headers,
    )

    assert json_response.status_code == 200
    assert json_response.headers["content-type"].startswith("application/json")
    assert [task["title"] for task in json_response.json()] == ["Export me"]


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


def test_task_attachment_upload_list_download_and_delete(client):
    user = register_user(client)
    headers = auth_headers(user["access_token"])
    task = client.post(
        "/api/tasks",
        json={"title": "Task with a file"},
        headers=headers,
    ).json()["task"]

    uploaded = client.post(
        f"/api/tasks/{task['id']}/attachments",
        files={"file": ("notes.txt", b"attachment contents", "text/plain")},
        headers=headers,
    )

    assert uploaded.status_code == 200
    attachment = uploaded.json()["attachment"]
    assert attachment["filename"] == "notes.txt"
    assert uploaded.json()["task"]["attachments"][0]["id"] == attachment["id"]

    listed = client.get(f"/api/tasks/{task['id']}/attachments", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["attachments"][0]["filename"] == "notes.txt"

    downloaded = client.get(attachment["download_url"], headers=headers)
    assert downloaded.status_code == 200
    assert downloaded.content == b"attachment contents"

    deleted = client.delete(
        f"/api/tasks/{task['id']}/attachments/{attachment['id']}",
        headers=headers,
    )
    assert deleted.status_code == 200
    assert deleted.json()["task"]["attachments"] == []
