import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

export function usePublisherAuth() {
  const auth = useContext(AuthContext);

  const publisherId = auth.user?.userId || auth.user?.user_id || auth.user?.id;
  const isPublisher = auth.user?.role === 'publisher' || auth.user?.role_id === 5;

  return {
    ...auth,
    publisherId,
    isPublisher,
    authLoading: auth.loading
  };
}

export default usePublisherAuth;

