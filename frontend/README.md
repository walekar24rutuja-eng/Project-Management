# Frontend

This directory contains the React and Vite frontend for the Project Management System.

## Structure

```text
frontend/
|-- public/
|-- src/
|   |-- assets/
|   |-- components/
|   |-- context/
|   |-- pages/
|   |-- services/
|   |-- App.jsx
|   |-- App.css
|   |-- index.css
|   `-- main.jsx
|-- package.json
`-- vite.config.js
```

The API client is at `src/services/api.js` and uses `http://localhost:5000/api` for local development.

## Development

```powershell
npm install
npm run dev
```

## Validation

```powershell
npm run lint
npm run build
npm run preview
```

The backend must be running for authenticated pages and API operations to work.
