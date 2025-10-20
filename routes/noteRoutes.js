const express = require("express");
const { uploadAttachments } = require("../middleware/upload");
const {
  createNote,
  getAllNotes,
  checkGrammar,
  editNote,
  getNoteById,
  deleteNote,
} = require("../controller/noteController");
const optionalUpload = require("../middleware/optionalUpload");

const router = express.Router();

// The uploadAttachments middleware runs first to process and save files (to disk or Cloudinary).
// Then, createNote runs, which saves the note metadata and the file metadata (from req.files)
// to the database.

router.route("/").post(uploadAttachments, createNote).get(getAllNotes);
router
  .route("/:id")
  .get(getNoteById)
  .patch(optionalUpload, editNote)
  .delete(deleteNote);
router.route("/:id/grammar-check").post(checkGrammar);

module.exports = router;
