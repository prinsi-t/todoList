const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  console.log('FETCHING:', url, options.method);
  return fetch(url, options);
}