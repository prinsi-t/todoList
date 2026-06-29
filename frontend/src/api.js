export async function apiCall(endpoint, options = {}) {
  console.log('FETCHING:', endpoint, options.method);
  return fetch(endpoint, options);
}