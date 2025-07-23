const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadCourse,
  listCourses,
  getSingleCourse,
  deleteCourse,
} = require("../controllers/courseController");

router.post("/upload/", protect, upload.fields([
  { name: "video", maxCount: 1 },
  { name: "material", maxCount: 1 },
]), uploadCourse);

router.get("/", listCourses);
router.get("/:id", getSingleCourse);
router.delete("/:id", protect, deleteCourse);

module.exports = router;
