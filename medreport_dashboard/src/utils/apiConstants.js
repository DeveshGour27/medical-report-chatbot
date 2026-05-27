// Centralized API base URLs — update these if backend port or host changes
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const API_USERS = `${API_BASE}/api/v1/users`;
export const API_REPORTS = `${API_BASE}/api/reports`;
export const API_CHAT = `${API_BASE}/chat`;
export const RAG_BASE = import.meta.env.VITE_RAG_API_URL || "http://127.0.0.1:8000";
