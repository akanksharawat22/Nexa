const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    index: true
  },
  isDirect: {
    type: Boolean,
    default: false
  },
  recipient: {
    type: String,
    default: null
  },
  sender: {
    username: { type: String, required: true },
    avatar: { type: String, default: 'avatar-1' }
  },
  content: {
    type: String,
    default: '',
    trim: true
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  fileType: {
    type: String,
    enum: ['image', 'file', null],
    default: null
  },
  replyTo: {
    _id: { type: String, default: null },
    content: { type: String, default: null },
    senderUsername: { type: String, default: null }
  },
  reactions: [
    {
      emoji: { type: String, required: true },
      users: [{ type: String }]
    }
  ],
  readBy: [
    {
      username: { type: String, required: true },
      readAt: { type: Date, default: Date.now }
    }
  ],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Text index for search
MessageSchema.index({ content: 'text', fileName: 'text' });

module.exports = mongoose.model('Message', MessageSchema);
