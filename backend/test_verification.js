const { io } = require('../frontend/node_modules/socket.io-client');
const http = require('http');

async function runVerification() {
  console.log('🚀 Starting Nexa Real-Time Verification Test...');
  const socketUrl = 'http://localhost:5000';

  const clientA = io(socketUrl, { transports: ['websocket'] });
  const clientB = io(socketUrl, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    clientA.on('connect', check);
    clientB.on('connect', check);
  });
  console.log('✅ Both Socket clients connected successfully');

  // Test 1: User Registration & Presence
  let presencePromise = new Promise((resolve) => {
    clientB.on('presence:update', (users) => {
      const usernames = users.map(u => u.username);
      if (usernames.includes('Alex') && usernames.includes('Maya')) {
        resolve(users);
      }
    });
  });

  clientA.emit('user:register', { username: 'Alex', avatar: 'avatar-1' });
  clientB.emit('user:register', { username: 'Maya', avatar: 'avatar-3' });

  const presenceList = await presencePromise;
  console.log('✅ Presence Update Verified: Online users =', presenceList.map(u => u.username).join(', '));

  // Test 2: Room Joining
  let alexJoinedRoom = false;
  let mayaJoinedRoom = false;

  clientA.emit('room:join', { room: 'tech-talk', username: 'Alex' });
  clientB.emit('room:join', { room: 'tech-talk', username: 'Maya' });

  // Test 3: Bi-Directional Messaging in 'tech-talk'
  let messagePromise = new Promise((resolve) => {
    clientB.on('message:receive', (msg) => {
      if (msg.content === 'Hello Maya from Alex!') {
        resolve(msg);
      }
    });
  });

  clientA.emit('message:send', {
    room: 'tech-talk',
    content: 'Hello Maya from Alex!',
    sender: { username: 'Alex', avatar: 'avatar-1' }
  });

  const receivedMsg = await messagePromise;
  console.log('✅ Real-Time Messaging Verified: Received message:', {
    sender: receivedMsg.sender.username,
    content: receivedMsg.content,
    room: receivedMsg.room,
    timestamp: receivedMsg.timestamp
  });

  // Test 4: Typing Indicator
  let typingPromise = new Promise((resolve) => {
    clientB.on('typing:user_started', (data) => {
      if (data.username === 'Alex' && data.room === 'tech-talk') {
        resolve(data);
      }
    });
  });

  clientA.emit('typing:start', { room: 'tech-talk', username: 'Alex' });
  const typingData = await typingPromise;
  console.log('✅ Typing Indicator Verified:', `${typingData.username} started typing in #${typingData.room}`);

  // Clean up
  clientA.disconnect();
  clientB.disconnect();

  console.log('🎉 ALL REAL-TIME SYSTEM VERIFICATION TESTS PASSED!');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
