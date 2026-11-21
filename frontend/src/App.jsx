import React from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ConversationDetails from './components/ConversationDetails';

const MainLayout = () => {
  const { user, showDetails, mobileView } = useSocket();

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className={`app-shell mobile-view-${mobileView} ${showDetails ? 'show-details-active' : ''}`}>
      <Sidebar />
      <ChatWindow />
      {showDetails && <ConversationDetails />}
    </div>
  );
};

function App() {
  return (
    <SocketProvider>
      <MainLayout />
    </SocketProvider>
  );
}

export default App;
