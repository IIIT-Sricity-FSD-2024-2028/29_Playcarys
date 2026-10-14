import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatDate } from '../../../services/publisherService';

export function PublisherSessionChart(props) {
  const { sessionsByDay = {} } = props;
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  const sortedDays = Object.keys(sessionsByDay).sort();
  const hasData = sortedDays.length > 0;

  useEffect(() => {
    if (!hasData || !canvasRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedDays.map((d) => formatDate(d)),
        datasets: [
          {
            label: 'Sessions Played',
            data: sortedDays.map((d) => sessionsByDay[d]),
            backgroundColor: 'rgba(0,212,255,0.7)',
            borderColor: '#00d4ff',
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: '#00d4ff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#f0f4ff', font: { size: 12, family: 'Inter' }, padding: 16 }
          },
          tooltip: {
            backgroundColor: 'rgba(8,10,15,0.95)',
            borderColor: '#00d4ff',
            borderWidth: 1,
            titleColor: '#00d4ff',
            bodyColor: '#f0f4ff',
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.raw} sessions played`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#6b7a99', font: { size: 11 }, maxRotation: 30 },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            ticks: { color: '#6b7a99', font: { size: 11 }, stepSize: 1, precision: 0 },
            grid: { color: 'rgba(0,212,255,0.08)' },
            beginAtZero: true
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [sessionsByDay, hasData]);

  return (
    <div className="card">
      <h3 className="side-h">📈 Session Trends</h3>
      <p className="side-note">Daily sessions across all your games</p>
      <div style={{ position: 'relative', height: '210px' }}>
        {hasData ? (
          <canvas ref={canvasRef} id="pubSessionsChart" />
        ) : (
          <div
            style={{
              height: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}
          >
            <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>📈</div>
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}
            >
              No sessions yet.
              <br />
              This fills in once players start your games.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublisherSessionChart;
