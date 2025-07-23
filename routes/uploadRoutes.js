const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');  // now this is the multer instance
const { uploadDicomFolder } = require('../controllers/fileController');

router.post('/dicom-folder', protect, upload.array('files', 2000), uploadDicomFolder);

module.exports = router;
