// Platform analytics for the Control Hub, worked out by the server (GET /analytics, admin and
// superuser only) from the sessions, match results, users, games and tournaments it holds.
import authService from './authService';

function apiBase() {
  if (typeof window !== 'undefined' && window.PC_API) {
    return window.PC_API;
  }
  const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
  return `http://${hostname || 'localhost'}:3000/api/v1`;
}

// Resolves to null when the server cannot be reached, so the page can say so instead of
// drawing empty charts.
export async function fetchAnalytics() {
  try {
    const headers = {};
    const token = authService.getApiToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(apiBase() + '/analytics?_=' + Date.now(), { headers: headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Paise to rupees, the way the rest of the platform writes money.
export function formatRupees(paise) {
  return '₹' + Math.round((paise || 0) / 100).toLocaleString('en-IN');
}
