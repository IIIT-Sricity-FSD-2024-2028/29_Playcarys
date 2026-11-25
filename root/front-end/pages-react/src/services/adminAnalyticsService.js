// Platform analytics for the Control Hub, worked out by the server (GET /analytics, admin and
// superuser only) from the sessions, match results, users, games and tournaments it holds.
import platformApi from './endpoints/platformApi';

// Resolves to null when the server cannot be reached, so the page can say so instead of
// drawing empty charts.
export async function fetchAnalytics() {
  try {
    return await platformApi.getAnalytics();
  } catch (e) {
    return null;
  }
}

// Paise to rupees, the way the rest of the platform writes money.
export function formatRupees(paise) {
  return '₹' + Math.round((paise || 0) / 100).toLocaleString('en-IN');
}

export default {
  fetchAnalytics,
  formatRupees
};
