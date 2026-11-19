import React from 'react';

const PresenceBadge = ({ status = 'online', size = 'md' }) => {
  return (
    <span
      className={`presence-dot size-${size} ${status}`}
      title={status === 'online' ? 'Online' : 'Offline'}
      aria-label={status === 'online' ? 'Online' : 'Offline'}
    />
  );
};

export default PresenceBadge;
