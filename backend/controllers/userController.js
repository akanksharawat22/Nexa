const User = require('../models/User');
const { getIsMongooseConnected, memoryStore } = require('../config/db');

const getUsers = async (req, res) => {
  try {
    if (getIsMongooseConnected()) {
      const users = await User.find().sort({ status: -1, username: 1 });
      return res.json({ success: true, data: users });
    } else {
      const users = Array.from(memoryStore.users.values());
      return res.json({ success: true, data: users });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Server error fetching users' });
  }
};

module.exports = {
  getUsers
};
