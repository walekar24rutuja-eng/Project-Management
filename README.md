# Project Management System

A full-stack final-year project management application for students, mentors, and administrators.

## Repository structure

The repository is organized as a two-part application:

```text
Project-Management/
|-- backend/                 Express, MongoDB, authentication, and API tests
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- tests/
|   |-- utils/
|   |-- .env.example
|   |-- package.json
|   `-- server.js
|-- frontend/                React and Vite client
|   |-- public/
|   `-- src/
|       |-- components/
|       |-- context/
|       |-- pages/
|       `-- services/
|-- FEATURES.md
|-- new structure.md
`-- .gitignore
```

There is no nested `Project-Management-System-main/` directory. Run backend and frontend commands from their respective directories.

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB
- Optional: Cloudflare R2 credentials for report storage

## Setup

### 1. Configure the backend

```powershell
Set-Location backend
npm install
Copy-Item .env.example .env
```

Set at least `MONGO_URI`, `JWT_SECRET`, and the initial administrator variables in `backend/.env`. `JWT_SECRET` must contain at least 32 characters. The R2 variables are optional unless report uploads should use Cloudflare R2.

Start the API:

```powershell
npm run dev
```

The API listens on `http://localhost:5000` by default.

### 2. Start the frontend

In a separate terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Vite prints the local frontend URL when it starts. The frontend API client currently expects the backend at `http://localhost:5000/api`.

## Validation

Run from `backend/`:

```powershell
npm test
```

Run from `frontend/`:

```powershell
npm run lint
npm run build
```

## Main documentation

- [FEATURES.md](FEATURES.md) - implemented workflows and API reference
- [new structure.md](new%20structure.md) - team and project ownership rules
- [frontend/README.md](frontend/README.md) - frontend-specific development details
