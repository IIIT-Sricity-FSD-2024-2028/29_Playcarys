/*
 * Auto-logout after inactivity, for the staff roles only.
 *
 * The limit is the "Session Timeout" the admin sets on the Settings page. It is read from the
 * server (GET /platform-status), so a change reaches every open staff tab within a minute.
 * Players and publishers are not signed out: they sit in games without touching the page.
 */
import { useContext, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchPlatformStatus } from '../features/platform/platformSlice';
import AuthContext from '../context/AuthContext';

export const IDLE_ROLES = ['admin', 'superuser', 'moderator'];

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export function useIdleLogout() {
  const { user, logout } = useContext(AuthContext);
  const dispatch = useDispatch();
  const enabled = !!user && IDLE_ROLES.includes(user.role);

  // The newest logout function, so the timer never calls an old one.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!enabled) return undefined;

    let lastActive = Date.now();
    let limitMinutes = 30;
    const markActive = () => {
      lastActive = Date.now();
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }));

    async function loadLimit() {
      try {
        const status = await dispatch(fetchPlatformStatus()).unwrap();
        const minutes = Number(status?.sessionTimeoutMinutes);
        if (Number.isFinite(minutes) && minutes > 0) limitMinutes = minutes;
      } catch (e) {
        // backend down: keep the last known limit
      }
    }
    loadLimit();
    const limitTimer = setInterval(loadLimit, 60000);

    // Compared against the clock, not counted down, so a laptop that slept is signed out on wake.
    const checkTimer = setInterval(() => {
      if (Date.now() - lastActive < limitMinutes * 60000) return;
      try {
        sessionStorage.setItem(
          'pc_logout_reason',
          'You were signed out after ' + limitMinutes + ' minutes of inactivity.'
        );
      } catch (e) {
        // storage blocked: the login page just will not show the reason
      }
      logoutRef.current();
    }, 10000);

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive));
      clearInterval(limitTimer);
      clearInterval(checkTimer);
    };
  }, [enabled]);
}

export default useIdleLogout;
