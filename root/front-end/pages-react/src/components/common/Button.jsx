import React from 'react';

export function Button(props) {
  const {
    variant = 'primary', // primary, purple, green, red, yellow, ghost, outline
    size = '', // sm, lg
    className = '',
    children,
    onClick,
    type = 'button',
    disabled = false,
    title = '',
    style = {}
  } = props;

  let btnClasses = 'btn';
  if (variant) btnClasses += ` btn-${variant}`;
  if (size) btnClasses += ` btn-${size}`;
  if (className) btnClasses += ` ${className}`;

  return (
    <button
      type={type}
      className={btnClasses}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
}

export default Button;
