import React from 'react';

export function PublisherPageHeader(props) {
  const { title, subtitle, actions } = props;

  return (
    <div className="pub-head">
      <div className="pub-head-text">
        <div className="hero-greeting">Publisher Studio</div>
        <h1 className="pub-title">{title}</h1>
        {subtitle && <div className="pub-sub">{subtitle}</div>}
      </div>
      {actions && <div className="pub-head-actions">{actions}</div>}
    </div>
  );
}

export default PublisherPageHeader;
