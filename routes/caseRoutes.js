const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  uploadCase,
  listCases,
  getSingleCase,
  deleteCase,
} = require('../controllers/caseController');

router.post('/upload/', protect, upload.array("files", 2000), uploadCase);
router.get('/', listCases);
router.get('/:id', getSingleCase);
router.delete('/:id', protect, deleteCase);

module.exports = router;