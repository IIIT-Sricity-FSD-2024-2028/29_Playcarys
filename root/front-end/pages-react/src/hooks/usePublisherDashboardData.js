import { useEffect, useState } from 'react';
import publisherService from '../services/publisherService';

export function usePublisherDashboardData(
  publisherId,
  isPublisher
) {
  const [dashData, setDashData] = useState(null);
  const [earningsData, setEarningsData] = useState(null);
  const [earningsLoading, setEarningsLoading] =
    useState(true);
  const [earningsError, setEarningsError] =
    useState(null);

  useEffect(() => {
    if (!isPublisher || !publisherId) return undefined;

    let active = true;

    const dashboardData =
      publisherService.getDashboardData(publisherId);

    setDashData(dashboardData);
    setEarningsLoading(true);
    setEarningsError(null);

    async function loadEarnings() {
      try {
        const response =
          await publisherService.getEarnings(publisherId);

        if (active) {
          setEarningsData(response);
        }
      } catch (error) {
        console.warn(
          'Authoritative earnings API failed or offline:',
          error
        );

        if (active) {
          setEarningsError(error);
        }
      } finally {
        if (active) {
          setEarningsLoading(false);
        }
      }
    }

    loadEarnings();

    return () => {
      active = false;
    };
  }, [publisherId, isPublisher]);

  return {
    dashData,
    earningsData,
    earningsLoading,
    earningsError
  };
}

export default usePublisherDashboardData;

