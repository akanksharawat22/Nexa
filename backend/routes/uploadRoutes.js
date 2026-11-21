const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { handleFileUpload } = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, upload.single('file'), handleFileUpload);

// Handle Multer upload errors gracefully
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ success: false, error: err.message || 'File upload error' });
  }
  next();
});

module.exports = router;
