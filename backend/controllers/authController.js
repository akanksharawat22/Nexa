const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { getIsMongooseConnected, memoryStore } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const generateToken = (userId, username) => {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
};

// 1. REGISTER
const register = async (req, res) => {
  try {
    const { username, password, displayName, avatar, bio } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName?.trim() || cleanUsername;
    const cleanAvatar = avatar || 'avatar-1';
    const cleanBio = bio?.trim() || 'Hey there! I am using Nexa.';

    if (getIsMongooseConnected()) {
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Username already taken' });
      }

      const newUser = await User.create({
        username: cleanUsername,
        password, // Pre-save hook will hash this
        displayName: cleanDisplayName,
        avatar: cleanAvatar,
        bio: cleanBio,
        status: 'online'
      });

      const token = generateToken(newUser._id, newUser.username);
      return res.status(201).json({
        success: true,
        token,
        user: newUser.toJSON()
      });
    } else {
      // Memory Store fallback
      if (memoryStore.users.has(cleanUsername)) {
        return res.status(400).json({ success: false, error: 'Username already taken' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const userObj = {
        _id: `user-${Date.now()}`,
        username: cleanUsername,
        password: hashedPassword,
        displayName: cleanDisplayName,
        avatar: cleanAvatar,
        bio: cleanBio,
        status: 'online',
        lastActive: new Date(),
        createdAt: new Date()
      };

      memoryStore.users.set(cleanUsername, userObj);

      const token = generateToken(userObj._id, userObj.username);
      const safeUser = { ...userObj };
      delete safeUser.password;

      return res.status(201).json({
        success: true,
        token,
        user: safeUser
      });
    }
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
};

// 2. LOGIN
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const cleanUsername = username.trim().toLowerCase();

    if (getIsMongooseConnected()) {
      const user = await User.findOne({ username: cleanUsername });
      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid username or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Invalid username or password' });
      }

      user.status = 'online';
      user.lastActive = new Date();
      await user.save();

      const token = generateToken(user._id, user.username);
      return res.json({
        success: true,
        token,
        user: user.toJSON()
      });
    } else {
      // Memory Store fallback
      const user = memoryStore.users.get(cleanUsername);
      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid username or password' });
      }

      // If user was created without password in earlier stage, support upgrade
      let isMatch = false;
      if (user.password) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        // Ephemeral user migration
        isMatch = true;
      }

      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Invalid username or password' });
      }

      user.status = 'online';
      user.lastActive = new Date();

      const token = generateToken(user._id, user.username);
      const safeUser = { ...user };
      delete safeUser.password;

      return res.json({
        success: true,
        token,
        user: safeUser
      });
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

// 3. GET CURRENT PROFILE (ME)
const getMe = async (req, res) => {
  try {
    const { username } = req.user;

    if (getIsMongooseConnected()) {
      const user = await User.findOne({ username });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      return res.json({ success: true, user: user.toJSON() });
    } else {
      const user = memoryStore.users.get(username);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      const safeUser = { ...user };
      delete safeUser.password;
      return res.json({ success: true, user: safeUser });
    }
  } catch (err) {
    console.error('GetMe Error:', err);
    res.status(500).json({ success: false, error: 'Server error retrieving profile' });
  }
};

// 4. UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const { username } = req.user;
    const { displayName, avatar, bio } = req.body;

    if (getIsMongooseConnected()) {
      const user = await User.findOne({ username });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (displayName !== undefined) user.displayName = displayName.trim();
      if (avatar !== undefined) user.avatar = avatar;
      if (bio !== undefined) user.bio = bio.trim();

      await user.save();
      return res.json({ success: true, user: user.toJSON() });
    } else {
      const user = memoryStore.users.get(username);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (displayName !== undefined) user.displayName = displayName.trim();
      if (avatar !== undefined) user.avatar = avatar;
      if (bio !== undefined) user.bio = bio.trim();

      const safeUser = { ...user };
      delete safeUser.password;
      return res.json({ success: true, user: safeUser });
    }
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ success: false, error: 'Server error updating profile' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
