import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export function PublisherViewsChart(props) {
  const { games = [] } = props;
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  const sortedGames = [...games].sort((a, b) => (b.views || 0) - (a.views || 0));
  const gamesWithViews = sortedGames.filter((g) => (g.views || 0) > 0);
  const totalViews = sortedGames.reduce((acc, g) => acc + (g.views || 0), 0);
  const isSingleDataPoint = gamesWithViews.length === 1;

  useEffect(() => {
    if (!games.length || totalViews === 0 || isSingleDataPoint || !canvasRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const centerTextPlugin = {
      id: 'centerText',
      afterDraw(chart) {
        const {
          ctx,
          chartArea: { top, bottom, left, right }
        } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label =
          totalViews > 0
            ? totalViews >= 1000
              ? (totalViews / 1000).toFixed(1) + 'K'
              : totalViews
            : '—';
        ctx.font = 'bold 20px Orbitron, monospace';
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(label, cx, cy - 8);
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#6b7a99';
        ctx.fillText('Total Views', cx, cy + 12);
        ctx.restore();
      }
    };

    const ctx = canvasRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sortedGames.map((g) => g.title || g.game_name || 'Game'),
        datasets: [
          {
            data: sortedGames.map((g) => g.views || 0),
            backgroundColor: [
              '#7c3aed',
              '#00d4ff',
              '#10b981',
              '#f59e0b',
              '#ec4899',
              '#6366f1'
            ],
            borderWidth: 2,
            borderColor: '#111520',
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#c8d0e7',
              font: { size: 11, family: 'Inter' },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8,
              generateLabels(chart) {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((label, i) => ({
                  text: `${label}  (${((ds.data[i] / totalViews) * 100).toFixed(0)}%)`,
                  fillStyle: ds.backgroundColor[i % ds.backgroundColor.length],
                  strokeStyle: ds.backgroundColor[i % ds.backgroundColor.length],
                  pointStyle: 'circle',
                  index: i
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(8,10,15,0.95)',
            borderColor: '#7c3aed',
            borderWidth: 1,
            titleColor: '#f0f4ff',
            bodyColor: '#c8d0e7',
            padding: 10,
            callbacks: {
              label: (ctx) =>
                ` ${parseInt(ctx.raw).toLocaleString()} views  (${((ctx.raw / totalViews) * 100).toFixed(1)}%)`
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [games, totalViews]);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <h3 className="side-h" style={{ margin: 0 }}>📊 Views by Game</h3>
          <p className="side-note" style={{ margin: '0.2rem 0 0 0' }}>Where your traffic goes</p>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
          ⏱️ Synced Just Now
        </span>
      </div>
      <div
        id="analytics-bars"
        style={{ height: '210px', position: 'relative' }}
      >
        {!games.length ? (
          <p
            style={{
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '1rem',
              fontSize: '0.875rem',
              marginTop: '2rem'
            }}
          >
            Publish a game to see its views here
          </p>
        ) : totalViews === 0 ? (
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
            <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>👁️</div>
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}
            >
              No views recorded yet.
              <br />
              Views accumulate when players browse your games.
            </div>
          </div>
        ) : isSingleDataPoint ? (
          <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{gamesWithViews[0].title || gamesWithViews[0].game_name}</strong>
              <span style={{ color: '#00d4ff', fontWeight: 700 }}>{gamesWithViews[0].views.toLocaleString()} views (100%)</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #7c3aed, #00d4ff)', borderRadius: '4px' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.85rem', marginBottom: 0, textAlign: 'center' }}>
              💡 Publish 2 or more titles to unlock comparative doughnut distribution analytics.
            </p>
          </div>
        ) : (
          <canvas ref={canvasRef} id="viewsChart" />
        )}
      </div>
    </div>
  );
}

export default PublisherViewsChart;
