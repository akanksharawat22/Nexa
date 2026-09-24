import axios from 'axios';

const API_BASE_URL = '/api';

export const fetchRooms = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/rooms`);
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching rooms:', err);
    return [];
  }
};

export const createRoom = async (roomData) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/rooms`, roomData);
    return res.data;
  } catch (err) {
    console.error('Error creating room:', err);
    return { success: false, error: err.response?.data?.error || 'Failed to create room' };
  }
};

export const fetchRoomMessages = async (roomName) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/messages/${roomName}`);
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching room messages:', err);
    return [];
  }
};

export const fetchUsers = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/users`);
    return res.data.data || [];
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
};
