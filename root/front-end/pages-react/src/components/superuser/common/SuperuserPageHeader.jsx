import React from 'react';

export function SuperuserPageHeader(props) {
  const { title, subtitle, children } = props;

  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  );
}

export default SuperuserPageHeader;
