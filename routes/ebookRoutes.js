const express = require("express");
const router = express.Router();
const ebookController = require("../controllers/ebookController");
const upload = require("../middleware/uploadMiddleware");

router.post("/upload", upload.fields([{ name: "pdf", maxCount: 1 }]), ebookController.uploadEbook);
router.get("/", ebookController.listEbooks);
router.get("/:id", ebookController.getEbook);
router.delete("/:id", ebookController.deleteEbook);

module.exports = router;
