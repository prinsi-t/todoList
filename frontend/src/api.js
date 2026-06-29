const API_URL = 'https://todolist-1-tuxt.onrender.com';

export async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  console.log('FETCHING:', url, options.method);
  return fetch(url, options);
}