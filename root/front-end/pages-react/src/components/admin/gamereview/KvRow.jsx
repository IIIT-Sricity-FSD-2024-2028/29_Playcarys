/*
 * Concepts used in this component:
 *  - Components, Props (label, children)
 *
 * One "label ........ value" line in the Submission and Delivery cards (old row(k, v)).
 */
import React from 'react';

export function KvRow(props) {
  const { label, children } = props;

  return (
    <div className="kv">
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default KvRow;
