\# Task Manager Web Application



\## Overview  

This project is a full-stack task management application that allows authenticated users to create, update, filter, and manage tasks. It demonstrates secure RESTful API design, cloud deployment, and scalable architecture suitable for modern AI-driven applications.



The system was designed with a focus on security, scalability, and extensibility, including an architecture that supports future AI and automation capabilities.



---



\## Live URLs  



Frontend  

👉 https://task-manager-frontend-6l9h.onrender.com  



Backend API  

👉 https://task-manager-app-3hcs.onrender.com  



Health Check  

👉 https://task-manager-app-3hcs.onrender.com/api/health  



---



\## Demo Credentials  



Email: demo@example.com  

Password: Password123  



---



\## Features  



\### Core  

* Secure email/password authentication  
* JWT-based stateless sessions  
* Multi-user data isolation  

\- Task CRUD operations  

\- Task filtering by status and due date  

\- Responsive UI  

\- Cloud deployment  



\### Security  

\- Password hashing (Argon2)  

\- JWT validation and token expiry  

\- Protected API routes  

\- Environment variable secret management  

\- CORS protection  



\### Scalability  

\- RESTful architecture  

\- Async FastAPI backend  

\- MongoDB document model  

\- Modular codebase  

\- Separation of frontend and backend services  



---



\## Technology Stack  



\### Frontend  

\- Next.js (React)

\- Axios

\- Context API

\- Render deployment



\### Backend  

\- Python

\- FastAPI

\- JWT authentication

\- Pydantic validation

\- MongoDB

\- Async API design



\### Infrastructure  

\- Render cloud deployment  

\- Docker-ready architecture  



---



\## Local Setup  



\### 1. Clone repository  

```bash

git clone https://github.com/King-Hero/Task-Manager-App

cd task-manager



\### 2. Backend

```bash
cd backend

python -m venv .venv

source .venv/bin/activate   # Windows: .venv\\Scripts\\Activate

pip install -r requirements.txt



Create .env

```ini

MONGODB\_URI=your\_local\_or\_atlas\_uri

JWT\_SECRET=your\_secret



Run:

```bash

uvicorn app.main:app --reload



\### 3. Frontend

```bash
cd frontend

npm install

npm run dev



Create .env.local

```ini

NEXT\_PUBLIC\_API\_BASE\_URL=http://127.0.0.1:8000/api



---



\## API Design



The backend follows REST principles:



| Method | Endpoint         | Description     |

| ------ | ---------------- | --------------- |

| POST   | /api/auth/signup | Register user   |

| POST   | /api/auth/login  | Login           |

| GET    | /api/tasks       | List user tasks |

| POST   | /api/tasks       | Create task     |

| PATCH  | /api/tasks/{id}  | Update task     |

| DELETE | /api/tasks/{id}  | Delete task     |





\## Security Design



Authentication is implemented using JWT tokens.

Protected routes use FastAPI dependency injection:

```scss

Depends(get\_current\_user\_id)



This ensures secure, reusable authentication logic and aligns with enterprise backend architecture.



---



\## Testing



The backend includes automated tests covering:



* Authentication



* Task CRUD



* User data isolation



Run tests:



```bash

pytest



---



\## Deployment



Both frontend and backend are deployed using Render.



Key considerations:



* Environment variables managed securely



* No secrets exposed in frontend



* API base URL configured per environment



* CORS configured for production



---



\### Tradeoffs and Design Decisions



* FastAPI was selected for performance, async support, and native validation.



* MongoDB enables flexible schema evolution and rapid development.



* JWT authentication supports scalability and stateless APIs.



* Render was selected for simplicity and cost efficiency.



\### Future improvements:



* AI-powered task planning



* Real-time updates via WebSockets



* Role-based permissions



* Background workers



* Observability and logging



* CI/CD pipelines



---



Architecture



See architecture diagram in:



* architecture.mmd











