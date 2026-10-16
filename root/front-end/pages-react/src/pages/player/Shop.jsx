import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AuthContext from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import '../../styles/player/shop.css';

// Money formatting helper mirroring legacy utils.js Money object
const Money = {
  formatINR(paise, opts) {
    const p = Math.round(Number(paise) || 0);
    const rupees = p / 100;
    const decimals = opts && opts.decimals != null ? opts.decimals : p % 100 === 0 ? 0 : 2;
    return (
      '₹' +
      rupees.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    );
  },
  formatCarys(carys) {
    return (Number(carys) || 0).toLocaleString('en-IN');
  },
};

const RARITY_COLOR = {
  common: '#6b7a99',
  rare: '#00d4ff',
  epic: '#7c3aed',
  legendary: '#f59e0b',
};

const labelFor = (cat) => {
  return String(cat || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export function Shop() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const uid = Number(user?.id || user?.user_id || 7);

  const [catalogue, setCatalogue] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pending action locks
  const [pendingAction, setPendingAction] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Confirmation modal state (for purchases, subscriptions, and mystery rewards)
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Fetch catalogue from backend
  const loadCatalogue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/economy/catalogue?viewerId=' + encodeURIComponent(uid));
      setCatalogue(res);
    } catch (err) {
      console.error('Failed to load catalogue:', err);
      setError(err.message || 'Could not load the shop.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogue();
  }, [uid]);

  // Dynamic Categories from items
  const categories = catalogue?.items
    ? [...new Set(catalogue.items.map((i) => i.category))].sort()
    : [];

  // Tab List: All Items, dynamic categories, Owned, Membership (plans)
  const tabs = [
    { id: 'all', label: 'All Items' },
    ...categories.map((c) => ({ id: c, label: labelFor(c) })),
    { id: 'owned', label: 'Owned' },
    { id: 'plans', label: 'Membership' },
  ];

  // Filter items based on activeTab
  let displayedItems = catalogue?.items || [];
  if (activeTab === 'owned') {
    displayedItems = displayedItems.filter((i) => i.owned);
  } else if (activeTab !== 'all' && activeTab !== 'plans') {
    displayedItems = displayedItems.filter((i) => i.category === activeTab);
  }

  // --- Purchase Flow ---
  const handleBuy = (item, currency) => {
    if (pendingAction) return;

    const priceDisplay =
      currency === 'carys'
        ? Money.formatCarys(item.price_carys) + ' Carys'
        : item.price_display;

    const payingCarys = currency === 'carys';
    const currentBalance = catalogue?.balance_carys || 0;
    const after = payingCarys ? currentBalance - (item.price_carys || 0) : null;

    const rows = [['Price', priceDisplay]];
    if (payingCarys) {
      rows.push(['Your balance', Money.formatCarys(currentBalance) + ' Carys']);
      rows.push(['After this', Money.formatCarys(after) + ' Carys']);
    }
    if (item.slot) {
      rows.push(['Worn on', labelFor(item.slot)]);
    }

    setConfirmDialog({
      title: `Buy ${item.name}?`,
      message: item.description || '',
      art: item.preview,
      rows,
      confirmText: payingCarys ? `Spend ${Money.formatCarys(item.price_carys)} Carys` : `Pay ${priceDisplay}`,
      tone: payingCarys && after < 0 ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          setPendingAction(true);
          const idempotencyKey = `${uid}-${item.id}-${currency}-${Date.now()}`;
          const res = await api.post('/economy/purchase', {
            user_id: uid,
            item_id: item.id,
            currency,
            idempotency_key: idempotencyKey,
          });

          if (res.was_mystery) {
            await loadCatalogue();
            setConfirmDialog({
              title: `You got ${res.item?.name || 'an item'}!`,
              message: res.item?.description || '',
              art: res.item?.preview,
              rows: [
                ['Rarity', String(res.item?.rarity || '').toUpperCase()],
                ['You paid', res.charged || priceDisplay],
                ['Balance', Money.formatCarys(catalogue?.balance_carys || 0) + ' Carys'],
              ],
              confirmText: 'Nice',
              cancelText: 'Close',
              isAlert: true,
              onConfirm: () => setConfirmDialog(null),
              onCancel: () => setConfirmDialog(null),
            });
          } else {
            setConfirmDialog(null);
            showToast(`Bought ${item.name} for ${res.charged || priceDisplay}`, 'success');
            await loadCatalogue();
          }
        } catch (err) {
          console.error('Purchase failed:', err);
          showToast(err.message || 'Purchase failed', 'error');
          setConfirmDialog(null);
        } finally {
          setPendingAction(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // --- Equip / Unequip ---
  const handleEquip = async (itemId) => {
    if (pendingAction) return;
    try {
      setPendingAction(true);
      await api.post('/economy/equip', { user_id: uid, item_id: itemId });
      showToast('Equipped', 'success');
      await loadCatalogue();
    } catch (err) {
      console.error('Equip failed:', err);
      showToast(err.message || 'Equip failed', 'error');
    } finally {
      setPendingAction(false);
    }
  };

  const handleUnequip = async (itemId) => {
    if (pendingAction) return;
    try {
      setPendingAction(true);
      await api.post('/economy/unequip', { user_id: uid, item_id: itemId });
      showToast('Removed', 'success');
      await loadCatalogue();
    } catch (err) {
      console.error('Unequip failed:', err);
      showToast(err.message || 'Unequip failed', 'error');
    } finally {
      setPendingAction(false);
    }
  };

  // --- Subscription / Plan Flow ---
  const handleSubscribe = (plan) => {
    if (pendingAction) return;

    setConfirmDialog({
      title: `Subscribe to ${plan.name}?`,
      message: `Renews every ${plan.interval}. Cancel any time.`,
      art: '⭐',
      rows: [
        ['Price', `${plan.price_display} / ${plan.interval}`],
        ['Carys each month', Money.formatCarys(plan.stipend_carys)],
      ],
      confirmText: 'Subscribe',
      tone: 'primary',
      onConfirm: async () => {
        try {
          setPendingAction(true);
          const res = await api.post('/economy/subscribe', {
            user_id: uid,
            plan_id: plan.id,
          });
          setConfirmDialog(null);
          showToast(`Subscribed — ${Money.formatCarys(res.stipend_carys)} Carys credited`, 'success');
          await loadCatalogue();
        } catch (err) {
          console.error('Subscription failed:', err);
          showToast(err.message || 'Subscription failed', 'error');
          setConfirmDialog(null);
        } finally {
          setPendingAction(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleClaimStipend = async () => {
    if (pendingAction) return;
    try {
      setPendingAction(true);
      const res = await api.post('/economy/claim-stipend', { user_id: uid });
      showToast(`${Money.formatCarys(res.stipend_carys)} Carys credited`, 'success');
      await loadCatalogue();
    } catch (err) {
      console.error('Claim stipend failed:', err);
      showToast(err.message || 'Claim failed', 'error');
    } finally {
      setPendingAction(false);
    }
  };

  // Calculated Rupee Worth
  const worthPaise = (catalogue?.balance_carys || 0) * 10;
  const worthText = 'about ' + Money.formatINR(worthPaise) + ' of value';

  // Subscription banner data
  const sub = catalogue?.subscription;
  const currentPlan = sub ? (catalogue?.plans || []).find((p) => p.id === sub.tier) : null;
  const cheapestPlan = (catalogue?.plans || [])
    .slice()
    .sort((a, b) => a.price_paise - b.price_paise)[0];

  const renewsDate = sub?.expires_at
    ? new Date(sub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="page-wrapper">
      <div className="page-content" style={{ maxWidth: '1120px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Header Row */}
        <div className="page-header-row mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/player/dashboard')}
              style={{ padding: '0.5rem 0.8rem' }}
            >
              ❮ Dashboard
            </button>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Orbitron', monospace", fontSize: '1.8rem', color: '#fff' }}>
                🛍️ Shop
              </h1>
              <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.86rem' }}>
                Spend the Carys you have earned, or pay in rupees
              </p>
            </div>
          </div>
        </div>

        {/* Balance Banner */}
        <div className="shop-balance">
          <div>
            <div className="shop-balance-val" id="bal-carys">
              {catalogue ? Money.formatCarys(catalogue.balance_carys) : '—'}
            </div>
            <div className="shop-balance-lbl">Your Carys</div>
            <div className="shop-balance-worth" id="bal-worth">
              {catalogue ? worthText : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="text-muted" style={{ fontSize: '0.72rem', maxWidth: '24rem', lineHeight: 1.5 }}>
              Carys are earned by playing. Every match pays out, and the rate is set by the
              platform — not by the game you played.
            </div>
          </div>
        </div>

        {/* Membership Banner */}
        {sub ? (
          <div className="sub-banner active">
            <div className="sub-banner-main">
              <div className="sub-badge">{(currentPlan?.name || sub.tier).toUpperCase()}</div>
              <div>
                <div className="sub-banner-title">You are a member</div>
                <div className="sub-banner-sub">
                  {Money.formatCarys(currentPlan?.stipend_carys || 0)} Carys a month · renews {renewsDate}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveTab('plans')}
            >
              Manage
            </button>
          </div>
        ) : cheapestPlan ? (
          <div className="sub-banner">
            <div className="sub-banner-main">
              <div className="sub-badge">PRO</div>
              <div>
                <div className="sub-banner-title">
                  {Money.formatCarys(cheapestPlan.stipend_carys)} Carys every month, from {cheapestPlan.price_display}
                </div>
                <div className="sub-banner-sub">
                  Lower platform cut on tournaments you run · private invite-only brackets
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('plans')}
            >
              See plans
            </button>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="shop-tabs" id="shop-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`shop-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="shop-empty">Loading catalogue...</div>
        ) : error ? (
          <div className="shop-empty text-danger">Could not load the shop. {error}</div>
        ) : activeTab === 'plans' ? (
          /* Membership Plans Tab */
          <div className="plan-grid">
            {(catalogue?.plans || []).map((p) => {
              const isCurrent = sub && sub.tier === p.id;
              return (
                <div key={p.id} className={`plan-card ${isCurrent ? 'current' : ''}`}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{p.name}</div>
                    <div className="plan-price">
                      {p.price_display}
                      <small> / {p.interval}</small>
                    </div>
                  </div>
                  <div className="plan-stipend">
                    <strong style={{ color: 'var(--accent-cyan)' }}>
                      {Money.formatCarys(p.stipend_carys)} Carys
                    </strong>{' '}
                    credited every month — the subscription renews because the currency renews.
                  </div>
                  <ul className="plan-features">
                    {(p.features || []).map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={pendingAction}
                      onClick={handleClaimStipend}
                    >
                      Claim this month's Carys
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={pendingAction}
                      onClick={() => handleSubscribe(p)}
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="shop-empty">Nothing here yet.</div>
        ) : (
          /* Item Grid */
          <div className="shop-grid">
            {displayedItems.map((item) => {
              const isGradient = /gradient|#|rgb/i.test(item.preview || '');
              const rarityColor = RARITY_COLOR[item.rarity] || '#6b7a99';

              return (
                <div key={item.id} className={`shop-card ${item.owned ? 'owned' : ''}`}>
                  {/* Preview Banner */}
                  <div
                    className="shop-preview"
                    style={{
                      background: isGradient ? item.preview : 'var(--bg-secondary, rgba(18,23,33,0.5))',
                    }}
                  >
                    <span className="shop-rarity" style={{ color: rarityColor }}>
                      {item.rarity}
                    </span>
                    {!isGradient && (
                      <div className="shop-preview-emoji">{item.preview || '🎁'}</div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="shop-body">
                    <div className="shop-name">{item.name}</div>
                    <div className="shop-desc">{item.description || ''}</div>

                    {/* Actions */}
                    {item.owned ? (
                      item.is_equipped ? (
                        <div className="shop-actions">
                          <div className="shop-owned-tag">✓ Equipped</div>
                          {item.slot !== 'body' && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={pendingAction}
                              onClick={() => handleUnequip(item.id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="shop-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={pendingAction}
                            onClick={() => handleEquip(item.id)}
                          >
                            Equip
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="shop-actions">
                        {item.price_carys != null && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={pendingAction}
                            onClick={() => handleBuy(item, 'carys')}
                          >
                            {Money.formatCarys(item.price_carys)} Carys
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={pendingAction}
                          onClick={() => handleBuy(item, 'inr')}
                        >
                          {item.price_display}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div
          className="modal-overlay show"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={confirmDialog.onCancel}
        >
          <div
            className="modal-content-card"
            style={{
              borderColor:
                confirmDialog.tone === 'danger'
                  ? 'rgba(239, 68, 68, 0.45)'
                  : 'rgba(0, 212, 255, 0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDialog.art && (
              <div
                style={{
                  fontSize: '2.5rem',
                  textAlign: 'center',
                  marginBottom: '0.8rem',
                }}
              >
                {/gradient|#|rgb/i.test(confirmDialog.art) ? (
                  <div
                    style={{
                      height: '60px',
                      borderRadius: '8px',
                      background: confirmDialog.art,
                    }}
                  />
                ) : (
                  confirmDialog.art
                )}
              </div>
            )}
            <h3 className="text-white fw-bold mb-2 text-center" style={{ fontSize: '1.25rem', fontFamily: "'Orbitron', monospace" }}>
              {confirmDialog.title}
            </h3>
            {confirmDialog.message && (
              <p className="text-muted text-center mb-3" style={{ fontSize: '0.84rem' }}>
                {confirmDialog.message}
              </p>
            )}

            {confirmDialog.rows && confirmDialog.rows.length > 0 && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.9rem',
                  marginBottom: '1.25rem',
                }}
              >
                {confirmDialog.rows.map(([lbl, val], idx) => (
                  <div key={idx} className="confirm-row">
                    <span className="confirm-row-lbl">{lbl}</span>
                    <span className="confirm-row-val">{val}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="confirm-actions">
              {!confirmDialog.isAlert && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={pendingAction}
                  onClick={confirmDialog.onCancel}
                >
                  {confirmDialog.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                className={`btn btn-sm ${
                  confirmDialog.tone === 'danger' ? 'btn-red' : 'btn-primary'
                }`}
                disabled={pendingAction}
                onClick={confirmDialog.onConfirm}
              >
                {pendingAction ? 'Processing...' : confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}
    </div>
  );
}

export default Shop;
