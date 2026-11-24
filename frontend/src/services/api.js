import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://localhost:5000/api' : ''
);

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL must be configured for the production frontend');
}

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach JWT token to every request if it exists
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;