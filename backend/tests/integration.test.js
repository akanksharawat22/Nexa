const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      if (Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 NEXA COMPREHENSIVE INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health & Persistence Check
    console.log('--- 1. Health & Diagnostics Check ---');
    const health = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    assert(health.status === 200, 'Health endpoint returns 200 OK');
    assert(health.data.status === 'ok', 'Status is "ok"');
    assert(Boolean(health.data.storageMode), `Storage mode is "${health.data.storageMode}"`);

    // 2. User Registration (Alex & Maya)
    console.log('\n--- 2. User Registration ---');
    const u1Name = 'alex_' + Date.now().toString().slice(-4);
    const u2Name = 'maya_' + Date.now().toString().slice(-4);

    const regAlex = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: u1Name,
      password: 'password123',
      displayName: 'Alex Rivera',
      avatar: 'avatar-1',
      bio: 'Distributed Systems Architect'
    });
    assert(regAlex.status === 201, 'Alex registered (201 Created)');
    assert(Boolean(regAlex.data.token), 'Alex received JWT token');
    assert(regAlex.data.user.password === undefined, 'Password omitted from response');
    const alexToken = regAlex.data.token;

    const regMaya = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: u2Name,
      password: 'password123',
      displayName: 'Maya Chen',
      avatar: 'avatar-3'
    });
    assert(regMaya.status === 201, 'Maya registered (201 Created)');
    const mayaToken = regMaya.data.token;

    // 3. User Login
    console.log('\n--- 3. User Login & Password Verification ---');
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: u1Name,
      password: 'password123'
    });
    assert(loginRes.status === 200, 'Alex logged in successfully (200 OK)');
    assert(Boolean(loginRes.data.token), 'JWT token returned on login');

    // Wrong password test
    const loginFail = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: u1Name,
      password: 'wrong_password'
    });
    assert(loginFail.status === 400, 'Invalid password rejected with 400 Bad Request');

    // 4. Protected Route (/api/auth/me)
    console.log('\n--- 4. Protected Route & Auth Middleware ---');
    const meRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${alexToken}` }
    });
    assert(meRes.status === 200, 'Authorized request to /api/auth/me succeeded');
    assert(meRes.data.user.username === u1Name, 'User details match authenticated token');

    // Unauthorized request
    const noAuth = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET'
    });
    assert(noAuth.status === 401, 'Unauthenticated request correctly rejected with 401');

    // 5. Profile Update
    console.log('\n--- 5. User Profile Update ---');
    const updateRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/profile',
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${alexToken}`,
        'Content-Type': 'application/json'
      }
    }, {
      displayName: 'Alex Lead Architect',
      bio: 'Leading distributed chat platform development'
    });
    assert(updateRes.status === 200, 'Profile update returns 200 OK');
    assert(updateRes.data.user.displayName === 'Alex Lead Architect', 'Display name updated');
    assert(updateRes.data.user.bio.includes('Leading distributed'), 'Bio updated');

    // 6. Channel Creation & Retrieval
    console.log('\n--- 6. Channels Management ---');
    const newChannelName = 'test-room-' + Date.now().toString().slice(-4);
    const createRoomRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/rooms',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: newChannelName,
      topic: 'Channel for automated test validation'
    });
    assert(createRoomRes.status === 201, 'New channel created (201)');

    const roomsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/rooms',
      method: 'GET'
    });
    assert(roomsRes.status === 200, 'Fetch channels returns 200 OK');
    assert(roomsRes.data.data.some(r => r.name === newChannelName), 'Created channel is in channel list');

    // 7. File Upload (Multipart Form Data)
    console.log('\n--- 7. File Attachment & Upload Endpoint ---');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = 'Hello Nexa, this is an automated attachment test!';
    const filename = 'sample-test-document.txt';

    let bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n`),
      Buffer.from(fileContent, 'utf-8'),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const uploadRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${alexToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    }, bodyBuffer);

    assert(uploadRes.status === 201, 'File uploaded successfully (201 Created)');
    assert(uploadRes.data.file && uploadRes.data.file.url.startsWith('/uploads/'), 'Upload returned static file URL');
    assert(uploadRes.data.file.name === filename, 'Original filename preserved');

    // 8. Messages & Dual-Store Persistence
    console.log('\n--- 8. Message History & Operations ---');
    const msgHistory = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/messages/${newChannelName}`,
      method: 'GET'
    });
    assert(msgHistory.status === 200, 'Fetch room messages returns 200 OK');
    assert(Array.isArray(msgHistory.data.data), 'Messages is an array');

    // 9. Keyword Message Search
    console.log('\n--- 9. Keyword Message Search ---');
    const searchRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/messages/search?q=general`,
      method: 'GET'
    });
    assert(searchRes.status === 200, 'Keyword search returns 200 OK');
    assert(Array.isArray(searchRes.data.data), 'Search results returned as array');

    // 10. Read Receipts Endpoint
    console.log('\n--- 10. Read Receipts ---');
    const readRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/messages/read`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      room: newChannelName,
      username: u2Name
    });
    assert(readRes.status === 200, 'Mark messages read returns 200 OK');

    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test Suite Fatal Error:', err);
    process.exit(1);
  }
}

runTests();
