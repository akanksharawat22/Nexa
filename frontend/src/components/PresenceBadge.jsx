import React from 'react';

const PresenceBadge = ({ status = 'online', size = 'md' }) => {
  return (
    <span 
      className={`presence-dot ${status}`} 
      title={status === 'online' ? 'Online' : 'Offline'}
    />
  );
};

export default PresenceBadge;
