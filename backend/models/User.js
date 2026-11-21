const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 2,
    maxlength: 30
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    trim: true,
    default: null
  },
  avatar: {
    type: String,
    default: 'avatar-1'
  },
  bio: {
    type: String,
    default: 'Hey there! I am using Nexa.',
    maxlength: 160
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  socketId: {
    type: String,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to check password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON representation
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
