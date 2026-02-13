\# Task Manager Web App



A full-stack task management application that supports user authentication, task CRUD operations, filtering, and secure API access. This project demonstrates modern full-stack architecture using Next.js, FastAPI, MongoDB, and JWT authentication.



---



\## Overview



This application allows users to:



\- Sign up and log in using email and password

\- Create, update, delete, and manage tasks

\- Filter tasks by status and due date

\- View only their own tasks (multi-user isolation)

\- Securely interact with the backend using JWT authentication



Bonus features implemented:



\- Due date defaults

\- Automatic filter refresh

\- Robust error handling

\- Production-ready architecture and security practices



---



\## Tech Stack



\### Frontend

\- Next.js (App Router)

\- React

\- Axios

\- Client-side JWT storage



\### Backend

\- Python

\- FastAPI

\- Motor (async MongoDB)

\- JWT authentication

\- Argon2 password hashing



\### Database

\- MongoDB



\### DevOps

\- Docker (MongoDB)

\- Environment-based configuration



---



\## Architecture



```mermaid

flowchart LR

&nbsp;   User --> Frontend\[Next.js Frontend]

&nbsp;   Frontend -->|REST JSON| Backend\[FastAPI Backend]

&nbsp;   Backend -->|JWT Auth| Mongo\[(MongoDB)]



