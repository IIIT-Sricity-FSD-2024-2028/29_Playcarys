/*
 * Concepts used in this component:
 *  - Components, Props (on, onChange), Events (click), Callbacks (onChange gets the new value)
 *
 * The old makeToggle() switched the "on" class itself. Here the parent owns the value:
 * a click asks the parent for the opposite value. With no onChange (the two
 * Tournament Settings switches in the old page) a click does nothing, like the old page.
 */
import React from 'react';

export function Toggle(props) {
  const { on, onChange, id } = props;

  function handleClick() {
    if (onChange) onChange(!on);
  }

  return <div className={'toggle' + (on ? ' on' : '')} id={id} onClick={handleClick}></div>;
}

export default Toggle;
