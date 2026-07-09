/**
 * Central API configuration.
 *
 * To point at a different backend (staging, production):
 *   1. Set VITE_API_BASE in your .env file, OR
 *   2. Pass the env var when running: VITE_API_BASE=https://api.example.com npm run dev
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8082';

/**
 * Convenience wrapper — identical to fetch() but the path is resolved against API_BASE.
 *
 * Usage:
 *   import { apiFetch } from '../config/api';
 *   const res = await apiFetch('/api/attendance/check-in', { method: 'POST', ... });
 */
export function apiFetch(path, options = {}) {
    return fetch(`${API_BASE}${path}`, options);
}
