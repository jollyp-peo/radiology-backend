const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/atlasUploadMiddleware');
const {
  uploadAtlasSeries,
  getAtlasSeries,
  getSingleSeries,
  deleteAtlasSeries,
} = require('../controllers/atlasController');

router.post('/upload/', protect, upload, uploadAtlasSeries);
router.get('/', getAtlasSeries);
router.get('/:id', getSingleSeries);
router.delete("/:id", deleteAtlasSeries);

module.exports = router;

