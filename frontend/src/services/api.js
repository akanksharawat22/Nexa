import axios from 'axios';

const API_BASE_URL = '/api';

// Create dedicated axios instance with automatic JWT Authorization header
const apiClient = axios.create({
  baseURL: API_BASE_URL
});

apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('nexa_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('LocalStorage error in request interceptor:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- AUTHENTICATION APIS ---

export const registerUserApi = async (formData) => {
  try {
    const res = await apiClient.post('/auth/register', formData);
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Registration failed' };
  }
};

export const loginUserApi = async (formData) => {
  try {
    const res = await apiClient.post('/auth/login', formData);
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Login failed' };
  }
};

export const getMeApi = async () => {
  try {
    const res = await apiClient.get('/auth/me');
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to retrieve profile' };
  }
};

export const updateProfileApi = async (profileData) => {
  try {
    const res = await apiClient.put('/auth/profile', profileData);
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to update profile' };
  }
};

// --- FILE UPLOAD API ---

export const uploadFileApi = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'File upload failed' };
  }
};

// --- CHAT & ROOM APIS ---

export const searchMessagesApi = async (query, room) => {
  try {
    const params = { q: query };
    if (room) params.room = room;
    const res = await apiClient.get('/messages/search', { params });
    return res.data.data || [];
  } catch (err) {
    console.error('Error searching messages:', err);
    return [];
  }
};

export const markMessagesReadApi = async (room, username) => {
  try {
    const res = await apiClient.post('/messages/read', { room, username });
    return res.data;
  } catch (err) {
    return { success: false };
  }
};

export const fetchRooms = async () => {
  try {
    const res = await apiClient.get('/rooms');
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching rooms:', err);
    return [];
  }
};

export const createRoom = async (roomData) => {
  try {
    const res = await apiClient.post('/rooms', roomData);
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to create room' };
  }
};

export const fetchRoomMessages = async (roomName) => {
  try {
    const res = await apiClient.get(`/messages/${encodeURIComponent(roomName)}`);
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching room messages:', err);
    return [];
  }
};

export const editMessageApi = async (messageId, newContent, username) => {
  try {
    const res = await apiClient.put(`/messages/${messageId}`, {
      content: newContent,
      username
    });
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to edit message' };
  }
};

export const deleteMessageApi = async (messageId, username) => {
  try {
    const res = await apiClient.delete(`/messages/${messageId}`, {
      data: { username }
    });
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to delete message' };
  }
};

export const reactToMessageApi = async (messageId, emoji, username) => {
  try {
    const res = await apiClient.post(`/messages/${messageId}/react`, {
      emoji,
      username
    });
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to react' };
  }
};

export const fetchUsers = async () => {
  try {
    const res = await apiClient.get('/users');
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
};
