const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage }).fields([
  { name: 'files', maxCount: 1000 },
  { name: 'legend_image', maxCount: 1 },
]);

module.exports = upload;
