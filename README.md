# Task Manager Web Application

## Overview

This project is a full-stack, cloud-deployed task management application that enables authenticated users to securely create, manage, and track their tasks. The system demonstrates modern RESTful API design, secure authentication, scalable architecture, and extensibility for AI-driven capabilities.

The solution was built with a strong focus on security, reliability, and production-ready engineering practices. It reflects real-world backend architecture patterns including stateless authentication, modular services, and cloud deployment.

---

## Live Application

Frontend  
👉 https://task-manager-frontend-6l9h.onrender.com  

Backend API  
👉 https://task-manager-app-3hcs.onrender.com  

Health Check  
👉 https://task-manager-app-3hcs.onrender.com/api/health  

---

## Demo Credentials

Email: demo@example.com  
Password: Password123  

---

## Features

### Core Functionality
- Secure user authentication and authorization
- Task creation, update, deletion, and filtering
- Task prioritization and status tracking
- Due date management
- Filtering by status and due date
- Inline editing for improved usability
- Responsive, clean user interface
- Multi-user isolation and data security

---

### Security
- Password hashing using Argon2
- JWT-based stateless authentication
- Token validation and expiry
- Protected backend routes using dependency injection
- Secure environment variable management
- CORS configuration for production environments
- No sensitive secrets exposed to the frontend

---

### AI (Bonus Feature)
- Intelligent due date suggestion powered by OpenAI
- Confidence scoring and short reasoning provided
- Secure server-side AI integration
- Graceful fallback logic ensures system reliability if AI is unavailable
- Architecture designed to support future automation and task intelligence

---

### Scalability and Architecture
- RESTful backend design
- Asynchronous FastAPI services
- Modular codebase for maintainability
- Separation of frontend and backend services
- MongoDB document model for flexible schema evolution
- Stateless architecture for horizontal scalability
- Designed for future containerization and microservice expansion

---

## Technology Stack

### Frontend
- Next.js (React)
- Axios for API communication
- Context and client state management
- Deployed on Render

### Backend
- Python
- FastAPI
- Async API design
- JWT authentication
- Pydantic validation
- MongoDB (Atlas)

### Infrastructure
- Render cloud platform
- Environment-based configuration
- Secure production deployment
- Cloud database integration

---

## Quick Demo Workflow

1. Register or log in using the demo credentials.
2. Create a new task.
3. Use the AI “Suggest Due Date” feature.
4. Update, filter, and manage tasks.
5. Edit tasks inline.
6. Mark tasks as complete.

This demonstrates authentication, CRUD functionality, AI integration, and user isolation.

---

## Architecture Overview

The system follows a modern client-server architecture:

1. The Next.js frontend communicates with the backend through REST APIs.
2. The FastAPI backend manages authentication, business logic, and AI integration.
3. JWT tokens enable secure and scalable stateless sessions.
4. MongoDB stores user and task data.
5. AI capabilities are exposed through a dedicated backend endpoint.
6. All secrets and API keys are stored securely in environment variables.

The architecture is designed to support future extensions such as real-time updates, automation workflows, and advanced AI planning.

See architecture diagram in:
- `architecture.mmd`

---

## Local Setup

### 1. Clone Repository
 

git clone https://github.com/King-Hero/Task-Manager-App

cd task-manager



### 2. Backend

cd backend

python -m venv .venv


Activate environment:

Mac/Linux:

source .venv/bin/activate   

# Windows: 

.venv\\Scripts\\activate

# Install dependencies

pip install -r requirements.txt



Create .env file:

MONGODB_URI=your_local_or_atlas_uri
JWT_SECRET=your_secret
OPENAI_API_KEY=your_key_optional


Run backend:

uvicorn app.main:app --reload



### 3. Frontend

cd frontend
npm install
npm run dev



Create .env.local:

NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api



---



## API Design



The backend follows REST principles and JSON standards:



| Method | Endpoint         | Description     |

| ------ | ---------------- | --------------- |

| POST   | /api/auth/signup | Register user   |

| POST   | /api/auth/login  | Login           |

| GET    | /api/tasks       | List user tasks |

| POST   | /api/tasks       | Create task     |

| PATCH  | /api/tasks/{id}  | Update task     |

| DELETE | /api/tasks/{id}  | Delete task     |





## Security Design



Authentication is implemented using JWT tokens for stateless session management.

Protected routes use FastAPI dependency injection:

Depends(get_current_user_id)



This ensures:
- Centralized security logic
- Scalable architecture
- Enterprise-grade API design
- Reusable authentication middleware


---



## Testing



The backend includes automated tests covering:

* Authentication
* Task CRUD
* User isolation



Run tests:

pytest

---



## Deployment

Both frontend and backend are deployed using Render.



Key considerations:

- Environment variables managed securely
- No secrets exposed in client code
- Production CORS configuration
- Cloud MongoDB integration
- Backend and frontend deployed independently

---

## Reliability and AI Fallback

The AI module includes deterministic fallback logic to ensure system stability if external AI services are unavailable. This prevents downtime and maintains core application functionality.

---


### Tradeoffs and Design Decisions



- FastAPI was selected for performance, async support, and native validation.
- MongoDB enables flexible schema evolution and rapid development.
- JWT authentication supports scalability and stateless APIs.
- Render was selected for simplicity and cost efficiency.



### Future improvements:

- AI-powered task prioritization and planning
- Real-time updates via WebSockets
- Role-based access control
- Background job scheduling
- Observability and monitoring
- CI/CD pipelines
- Containerization with Docker
- Advanced analytics and insights



---

## Author Notes

This project demonstrates modern full-stack engineering, AI integration, and scalable system design aligned with enterprise best practices.

---

## Architecture Overview

The system follows a modern client-server architecture:

1. The frontend communicates with the backend via REST APIs.
2. Authentication is handled through JWT.
3. MongoDB stores users and task data.
4. AI capabilities are exposed via a dedicated backend endpoint.
5. OpenAI API keys are secured server-side.

See architecture diagram in:


* architecture.mmd











