const express = require('express');
const router = express.Router();
const { 
  getRoomMessages, 
  searchMessages,
  markMessagesAsRead,
  editMessage, 
  deleteMessage, 
  toggleReaction 
} = require('../controllers/messageController');

router.get('/search', searchMessages);
router.post('/read', markMessagesAsRead);
router.get('/:room', getRoomMessages);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/react', toggleReaction);

module.exports = router;
