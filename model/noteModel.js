const mongoose = require("mongoose");
const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "A note must have a title"],
      trim: true,
    },

    markdownContent: {
      type: String,
      required: [true, "A note must have content"],
    },
    htmlContent: {
      type: String,
    },
    attachments: [
      {
        originalName: String,
        uploadedFileName: String, //The unique file name on the server
        mimeTyepe: String,
        filePath: String, //Path where the file is stored
        size: Number, //File size in bytes
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);

// Export the model
module.exports = Note;
