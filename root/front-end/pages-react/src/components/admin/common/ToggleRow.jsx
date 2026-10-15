/*
 * Concepts used in this component:
 *  - Components, Props (title, description, on, onChange, id), prop drilling (passes on/onChange down to Toggle)
 *
 * One ".toggle-wrap" row: title + description on the left, the switch on the right.
 */
import React from 'react';
import Toggle from './Toggle';

export function ToggleRow(props) {
  const { title, description, on, onChange, id } = props;

  return (
    <div className="toggle-wrap">
      <div className="toggle-info">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <Toggle id={id} on={on} onChange={onChange} />
    </div>
  );
}

export default ToggleRow;
