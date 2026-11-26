import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchPublisherOnboarding } from '../features/profiles/publisherProfileSlice';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import PublisherNavbar from '../components/publisher/common/PublisherNavbar';
import AuthContext from '../context/AuthContext';
import LoadingState from '../components/common/LoadingState';
import useIdleLogout from '../hooks/useIdleLogout';

const ALLOWED_ROLES = ['publisher', 'superuser', 'admin'];

export function PublisherLayout() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useIdleLogout();

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setAccess(null);
    setAccessError(false);
    if (user?.role === 'publisher') {
      const pid = user.userId || user.id || user.user_id;
      dispatch(fetchPublisherOnboarding(pid))
        .unwrap()
        .then((res) => {
          if (!cancelled) setAccess(res?.profile || res);
        })
        .catch(() => {
          if (!cancelled) setAccessError(true);
        });
    }
    return () => { cancelled = true; };
  }, [dispatch, user, location.pathname]);
  const publishingPage = ['/publisher/publish', '/publisher/publish-tournament'].includes(location.pathname);
  const financePage = ['/publisher/finance', '/publisher/earnings'].includes(location.pathname);
  const restricted = user?.role === 'publisher' && (publishingPage || financePage);
  const unlocked = financePage ? access?.can_deposit && access?.can_withdraw : access?.can_publish;

  useEffect(() => {
    if (!loading && !allowed) {
      navigate('/');
    }
  }, [loading, allowed, navigate]);

  // Determine active page from current path
  let activePage = 'dashboard';
  if (location.pathname.includes('/publisher/my-games') || location.pathname.includes('/publisher/mygames')) {
    activePage = 'my-games';
  } else if (location.pathname.includes('/publisher/earnings') || location.pathname.includes('/publisher/finance')) {
    activePage = 'earnings';
  } else if (location.pathname.includes('/publisher/profile') || location.pathname.includes('/publisher/onboarding')) {
    activePage = 'profile';
  } else if (location.pathname.includes('/publisher/publish-tournament')) {
    activePage = 'publish-tournament';
  } else if (location.pathname.includes('/publisher/publish')) {
    activePage = 'publish';
  }

  if (loading || !allowed) {
    return <LoadingState message="Verifying publisher authorization..." minHeight="60vh" />;
  }

  return (
    <div className="dash-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublisherNavbar activePage={activePage} />
      <main className="page-wrapper" style={{ flex: 1 }}>
        {restricted && !unlocked ? (
          <section className="card" style={{ maxWidth: 720, margin: '48px auto', padding: 32 }}>
            <h1>{financePage ? 'Set up payments' : 'Get ready to publish'}</h1>
            <p style={{ lineHeight: 1.7, marginBlock: 20 }}>
              {accessError ? 'We could not check your account status. Refresh to try again.' : !access ? 'Checking your account requirements…' : financePage
                ? 'Payments unlock after identity approval and payment-profile review. Adding bank details alone does not verify them.'
                : 'Complete your developer profile and submit your identity details for review. Publishing unlocks after approval.'}
            </p>
            <Link className="btn btn-primary" to="/publisher/onboarding">Continue account setup</Link>
            <Link className="btn btn-ghost" to="/publisher/dashboard">Back to overview</Link>
          </section>
        ) : <Outlet />}
      </main>
    </div>
  );
}

export default PublisherLayout;
