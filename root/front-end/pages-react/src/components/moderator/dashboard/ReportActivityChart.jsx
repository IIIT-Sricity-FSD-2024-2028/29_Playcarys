import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export function ReportActivityChart(props) {
  const { labels = [], incoming = [], resolved = [] } = props;
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Incoming',
            data: incoming,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.08)',
            borderWidth: 2,
            pointBackgroundColor: '#f59e0b',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Resolved',
            data: resolved,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.07)',
            borderWidth: 2,
            pointBackgroundColor: '#10b981',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#c8d0e7',
              font: { size: 11 },
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(8,10,15,0.95)',
            borderColor: '#7c3aed',
            borderWidth: 1,
            titleColor: '#f0f4ff',
            bodyColor: '#c8d0e7',
            padding: 8
          }
        },
        scales: {
          x: {
            ticks: { color: '#6b7a99', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            ticks: { color: '#6b7a99', font: { size: 10 }, stepSize: 1, precision: 0 },
            grid: { color: 'rgba(124,58,237,0.08)' },
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
  }, [labels, incoming, resolved]);

  return (
    <div className="card mb-2 chart-card">
      <h3 className="mb-1" style={{ fontSize: '0.9rem' }}>
        📈 Report Activity (Last 7 Days)
      </h3>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
        Incoming reports vs. resolved per day
      </p>
      <div style={{ position: 'relative', height: '180px', width: '100%' }}>
        <canvas ref={canvasRef} id="activityChart"></canvas>
      </div>
    </div>
  );
}

export default ReportActivityChart;
