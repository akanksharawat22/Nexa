import React from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

const MainLayout = () => {
  const { user, registerUser } = useSocket();

  if (!user) {
    return <AuthModal onJoin={registerUser} />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <ChatWindow />
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
