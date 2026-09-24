const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  topic: {
    type: String,
    default: 'General room topic'
  },
  isPrivate: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
