const { io } = require('../frontend/node_modules/socket.io-client');
const http = require('http');

async function runVerification() {
  console.log('🚀 Starting PulseChat Real-Time Verification Test...');
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
      if (usernames.includes('Alice') && usernames.includes('Bob')) {
        resolve(users);
      }
    });
  });

  clientA.emit('user:register', { username: 'Alice', avatar: 'avatar-1' });
  clientB.emit('user:register', { username: 'Bob', avatar: 'avatar-2' });

  const presenceList = await presencePromise;
  console.log('✅ Presence Update Verified: Online users =', presenceList.map(u => u.username).join(', '));

  // Test 2: Room Joining
  let aliceJoinedRoom = false;
  let bobJoinedRoom = false;

  clientA.emit('room:join', { room: 'tech-talk', username: 'Alice' });
  clientB.emit('room:join', { room: 'tech-talk', username: 'Bob' });

  // Test 3: Bi-Directional Messaging in 'tech-talk'
  let messagePromise = new Promise((resolve) => {
    clientB.on('message:receive', (msg) => {
      if (msg.content === 'Hello Bob from Alice!') {
        resolve(msg);
      }
    });
  });

  clientA.emit('message:send', {
    room: 'tech-talk',
    content: 'Hello Bob from Alice!',
    sender: { username: 'Alice', avatar: 'avatar-1' }
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
      if (data.username === 'Alice' && data.room === 'tech-talk') {
        resolve(data);
      }
    });
  });

  clientA.emit('typing:start', { room: 'tech-talk', username: 'Alice' });
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
