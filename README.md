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
- Optional: Cloudinary credentials for report storage

## Setup

### 1. Configure the backend

```powershell
Set-Location backend
npm install
Copy-Item .env.example .env
```

Set at least `MONGO_URI`, `JWT_SECRET`, and the initial administrator variables in `backend/.env`. `JWT_SECRET` must contain at least 32 characters. The Cloudinary variables are optional unless report uploads should use Cloudinary.

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

## Vercel deployment

Deploy the frontend and backend as separate Vercel projects. The backend can use the repository root (using the root `vercel.json`) or `backend` as its project root (using `backend/vercel.json`). Set the frontend project's root directory to `frontend`; its `vercel.json` provides fallback routing for React Router pages.

In the backend Vercel project, set these environment variables:

```text
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<random secret with at least 32 characters>
ADMIN_NAME=<initial administrator name>
ADMIN_EMAIL=<initial administrator email>
ADMIN_PASSWORD=<initial administrator password>
CLOUDINARY_CLOUD_NAME=<optional>
CLOUDINARY_API_KEY=<optional>
CLOUDINARY_API_SECRET=<optional>
```

The backend Vercel configuration routes requests to the exported Express application as a serverless function.

In the frontend Vercel project, set `VITE_API_URL` to the deployed backend URL including `/api`, for example:

```text
VITE_API_URL=https://project-management-api.vercel.app/api
```

Redeploy the frontend after setting `VITE_API_URL`. Open the frontend project's URL for the UI; the backend project's root URL is API-only and does not serve the React homepage.

## Main documentation

- [FEATURES.md](FEATURES.md) - implemented workflows and API reference
- [new structure.md](new%20structure.md) - team and project ownership rules
- [frontend/README.md](frontend/README.md) - frontend-specific development details
