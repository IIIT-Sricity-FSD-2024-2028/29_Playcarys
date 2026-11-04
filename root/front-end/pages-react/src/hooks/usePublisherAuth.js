import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

export function usePublisherAuth() {
  const auth = useContext(AuthContext);

  const publisherId = auth.user?.userId;
  const isPublisher = auth.user?.role === 'publisher';

  return {
    ...auth,
    publisherId,
    isPublisher,
    authLoading: auth.loading
  };
}

export default usePublisherAuth;

