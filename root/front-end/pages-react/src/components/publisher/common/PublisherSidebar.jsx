import React from 'react';

export function PublisherSidebar(props) {
  const { children } = props;
  return (
    <aside className="pub-sidebar">
      {children}
    </aside>
  );
}

export default PublisherSidebar;
