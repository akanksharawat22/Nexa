const handleFileUpload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const fileUrl = `/uploads/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      file: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: isImage ? 'image' : 'file',
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('File Upload Error:', error);
    res.status(500).json({ success: false, error: 'Server error processing file upload' });
  }
};

module.exports = {
  handleFileUpload
};
