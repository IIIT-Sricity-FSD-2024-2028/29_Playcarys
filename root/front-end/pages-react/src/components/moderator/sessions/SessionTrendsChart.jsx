import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatDate } from './SessionKpiCards';

export function SessionTrendsChart({ matches = [] }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Compute daily aggregation
  const sessionsByDay = {};
  matches.forEach((s) => {
    const raw = s.created_at || s.start_time || s.end_time;
    if (!raw) return;
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return;
    const d = parsed.toISOString().split('T')[0];
    sessionsByDay[d] = (sessionsByDay[d] || 0) + 1;
  });

  const sortedDays = Object.keys(sessionsByDay).sort();
  const hasData = sortedDays.length > 0;

  useEffect(() => {
    if (!canvasRef.current || !hasData) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedDays.map((d) => formatDate(d)),
        datasets: [
          {
            label: 'Matches Played',
            data: sortedDays.map((d) => sessionsByDay[d]),
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(124, 58, 237, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'white'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: 'gray'
            }
          },
          y: {
            ticks: {
              color: 'gray'
            },
            beginAtZero: true
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [matches]);

  return (
    <div className="card mb-3 sessions-chart-card">
      <h3 className="mb-2">Platform Session Trends</h3>
      {hasData ? (
        <div className="sessions-chart-wrapper">
          <canvas ref={canvasRef} id="sessionsChart"></canvas>
        </div>
      ) : (
        <div
          style={{
            height: 'calc(100% - 2rem)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <p>No recorded session trends yet</p>
        </div>
      )}
    </div>
  );
}

export default SessionTrendsChart;
