import requests
import json

BASE_URL = 'http://localhost:8000/api'

# Setup: Get initial tasks to identify a valid one
tasks = requests.get(f'{BASE_URL}/tasks').json()
if not tasks:
    print("No tasks found to test")
    exit(1)

task_id = tasks[0]['id']
print(f"Testing with Task ID: {task_id}")

# PATCH to non-existent column_id
payload = {"column_id": 9999}
response = requests.patch(f'{BASE_URL}/tasks/{task_id}', json=payload)

print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.text}")
