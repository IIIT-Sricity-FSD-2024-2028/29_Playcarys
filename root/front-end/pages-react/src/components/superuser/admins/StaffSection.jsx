import React from 'react';
import StaffCard from './StaffCard';

export function StaffSection({ title, titleColor, users, currentUserId, onOpenActions, className = '' }) {
  return (
    <div className={className}>
      <h2 className="mb-2" style={{ fontSize: '1rem', color: titleColor }}>
        {title}
      </h2>
      {users && users.length > 0 ? (
        users.map((u) => {
          const uid = String(u.user_id ?? u.id);
          const isSelf = currentUserId && uid === String(currentUserId);
          return (
            <StaffCard
              key={uid}
              user={u}
              isSelf={isSelf}
              onOpenActions={onOpenActions}
            />
          );
        })
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
          No accounts in this role.
        </div>
      )}
    </div>
  );
}

export default StaffSection;
