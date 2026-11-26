import { useEffect, useState } from 'react';
import { useAppDispatch } from '../app/hooks';
import { fetchPublisherGames } from '../features/games/gameSlice';
import { fetchPublisherEarnings } from '../features/economy/walletSlice';
import publisherService from '../services/publisherService';

export function usePublisherDashboardData(
  publisherId,
  isPublisher
) {
  const dispatch = useAppDispatch();
  const [dashData, setDashData] = useState(null);
  const [earningsData, setEarningsData] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsError, setEarningsError] = useState(null);

  useEffect(() => {
    if (!isPublisher || !publisherId) return undefined;

    let active = true;

    const initial = publisherService.getDashboardData(publisherId);
    setDashData(initial);
    setEarningsLoading(true);
    setEarningsError(null);

    async function refreshDashboardWithBackend() {
      try {
        const res = await dispatch(fetchPublisherGames(publisherId)).unwrap();
        const freshGames = res?.games || res || (await publisherService.getPublisherGames(publisherId));
        if (active && freshGames) {
          const freshData = publisherService.getDashboardData(publisherId);
          const mergedGames = [...(freshData.myGames || [])];
          freshGames.forEach((bg) => {
            if (!mergedGames.some((g) => String(g.game_id || g.id) === String(bg.game_id || bg.id))) {
              mergedGames.push(bg);
            }
          });
          const approved = mergedGames.filter(
            (g) => g.game_approval_status === 'approved' || g.status === 'approved'
          );
          const pending = mergedGames.filter(
            (g) => g.game_approval_status === 'pending' || g.status === 'pending'
          );
          setDashData({
            ...freshData,
            myGames: mergedGames,
            approved,
            pending,
            liveCount: mergedGames.filter((g) => (g.game_status || (g.enabled ? 'enabled' : 'disabled')) === 'enabled').length
          });
        }
      } catch (err) {
        console.warn('Dashboard backend games refresh notice:', err);
      }
    }

    async function loadEarnings() {
      try {
        const res = await dispatch(fetchPublisherEarnings(publisherId)).unwrap();
        const response = res?.earnings || res;
        if (active) {
          setEarningsData(response);
        }
      } catch (error) {
        console.warn('Authoritative earnings API failed or offline:', error);
        if (active) {
          setEarningsError(error);
        }
      } finally {
        if (active) {
          setEarningsLoading(false);
        }
      }
    }

    refreshDashboardWithBackend();
    loadEarnings();

    return () => {
      active = false;
    };
  }, [dispatch, publisherId, isPublisher]);

  return {
    dashData,
    earningsData,
    earningsLoading,
    earningsError
  };
}

export default usePublisherDashboardData;
