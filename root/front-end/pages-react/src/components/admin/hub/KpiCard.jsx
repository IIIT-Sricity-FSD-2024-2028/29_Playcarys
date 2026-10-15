/*
 * Concepts used in this component:
 *  - Components, Props (color, label, value, icon, children)
 *
 * One ".kpi-card" tile of the Control Hub: a coloured number with an optional line under it.
 */
import React from 'react';

export function KpiCard(props) {
  const { color, label, value, icon, children } = props;

  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value}</div>
      {children}
      <div className="kpi-icon">{icon}</div>
    </div>
  );
}

export default KpiCard;
