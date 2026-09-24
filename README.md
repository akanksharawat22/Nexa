# ⚡ PulseChat — Real-Time Chat Platform

![PulseChat Banner](https://img.shields.io/badge/PulseChat-Real--Time-6366f1?style=for-the-badge&logo=socket.io&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

PulseChat is a full-stack real-time messaging application featuring instant WebSocket communication, multi-room channel switching, user presence tracking, live typing indicators, persistent chat history, and a modern glassmorphism dark UI.

---

## ✨ Features

- 💬 **Multi-Room Chat Channels**: Default channels (`#general`, `#tech-talk`, `#random`, `#design`) plus dynamic user-created rooms.
- ⚡ **Real-Time WebSocket Engine**: Instant bi-directional message broadcasting powered by Socket.io.
- 👤 **Custom User Avatars**: Quick registration modal with custom emoji avatar selection.
- 🟢 **Live User Presence**: Track active online users globally and inside specific rooms.
- ✍️ **Typing Indicators**: Real-time "User is typing..." feedback.
- 📜 **Persistent History & Rest APIs**: Room message history stored and retrieved seamlessly.
- 🛡️ **Resilient Database Architecture**: Connects to local MongoDB with an automatic **In-Memory Store fallback** if MongoDB is offline.
- 🎨 **Modern Glassmorphism UI**: Curated dark theme, smooth micro-animations, dynamic responsive layout, custom scrollbars, and modern typography.

---

## 🛠️ Tech Stack

### Frontend (`/frontend`)
- **React 18** — Component-driven UI architecture
- **Vite** — High-performance frontend build tool
- **Socket.io Client** — Real-time event communication
- **Axios** — HTTP client for REST API calls
- **Vanilla CSS** — Custom design tokens, glassmorphism gradients, animations

### Backend (`/backend`)
- **Node.js & Express** — Decoupled REST API routing
- **Socket.io** — WebSocket room & event manager
- **Mongoose / MongoDB** — Schemas for Messages, Rooms, and Users
- **In-Memory Fallback** — Instant startup without requiring a local database setup

---

## 📂 Project Structure

```text
pulse-chat/
├── 📁 frontend/                         # React Client Application
│   ├── index.html                       # HTML Template & Google Fonts
│   ├── vite.config.js                   # Vite Bundler Config
│   └── src/
│       ├── App.jsx                      # Main Layout Component
│       ├── index.css                    # Design System & Styling
│       ├── components/                  # UI Components (AuthModal, ChatWindow, Sidebar, etc.)
│       ├── context/                     # SocketContext Provider & State Management
│       └── services/                    # API Integration
│
├── 📁 backend/                          # Node.js Express & Socket Server
│   ├── index.js                         # Application Entry Point & Static Host
│   ├── config/                          # MongoDB & Fallback Memory DB Config
│   ├── controllers/                     # REST API Route Controllers
│   ├── models/                          # Mongoose Database Models
│   ├── routes/                          # Express API Routes (/api/*)
│   └── sockets/                         # Real-Time Event Handlers
│
└── .gitignore                           # Git Exclusion Rules
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/)

### Step 1: Clone the Repository
```bash
git clone https://github.com/YOUR-USERNAME/pulse-chat.git
cd pulse-chat
```

### Step 2: Install Dependencies
Install dependencies for both frontend and backend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 💻 Running the Application

### Option 1: Single Port Production Mode (Recommended)
Build the frontend and run everything together on **`http://localhost:5000`**:

1. Build frontend bundle:
   ```bash
   cd frontend
   npm run build
   ```

2. Start the backend server:
   ```bash
   cd ../backend
   node index.js
   ```

3. Open **[http://localhost:5000](http://localhost:5000)** in your web browser.

---

### Option 2: Independent Development Mode (Hot Reloading)

Run the backend and frontend in separate terminals:

- **Terminal 1 (Backend API & Sockets)**:
  ```bash
  cd backend
  npm run dev
  ```
  *(Server listens on `http://localhost:5000`)*

- **Terminal 2 (Frontend React Dev Server)**:
  ```bash
  cd frontend
  npm run dev
  ```
  *(Vite server opens on `http://localhost:5173`)*

---

## 📡 API & Socket Event Reference

### REST API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check endpoint |
| `/api/rooms` | `GET` | Retrieve list of all chat rooms |
| `/api/rooms` | `POST` | Create a new room channel |
| `/api/messages/:room` | `GET` | Retrieve message history for a room |
| `/api/users` | `GET` | Retrieve active registered users |

### Socket.io Events

| Event Name | Direction | Payload Description |
| :--- | :--- | :--- |
| `user:register` | Client ➔ Server | `{ username, avatar }` |
| `room:join` | Client ➔ Server | `{ room, username }` |
| `room:leave` | Client ➔ Server | `{ room, username }` |
| `message:send` | Client ➔ Server | `{ room, content, sender }` |
| `message:receive` | Server ➔ Client | Broadcasts new message to room |
| `typing:start` | Client ➔ Server | `{ room, username }` |
| `typing:stop` | Client ➔ Server | `{ room, username }` |
| `presence:update` | Server ➔ Client | Global online user list update |

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
