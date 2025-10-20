"use strict";
const Note = require("../model/noteModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const marked = require("marked");
const axios = require("axios");
const fs = require("fs").promises;
const cloudinary = require("cloudinary").v2;
const path = require("path");

//  Helper Function
// Delete file from local storage or Cloudinary
const deleteFile = async (filePath) => {
  if (process.env.NODE_ENV === "production") {
    try {
      // filePath in production will be the Cloudinary URL or Public ID.
      // When using CloudinaryStorage, file.path is the URL, and file.filename is the Public ID.
      // Assuming your file schema saves the Cloudinary Public ID to be safe.
      // For Cloudinary, we need the public ID, which is usually part of the URL's path.
      // A simple method is to extract the public ID from the file path/URL.
      const urlParts = filePath.split("/");
      // The folder is 'markdown-notes-attachements' as per your upload.js
      const filenameWithExt = urlParts[urlParts.length - 1];
      const filename = filenameWithExt.split(".")[0];
      const publicId = `markdown-notes-attachements/${filename}`;

      // You might need to adjust this public ID extraction based on what exactly Multer-Cloudinary
      // saves in file.path (which you map to filePath). If you have the public_id, use that directly!

      await cloudinary.uploader.destroy(publicId);
      console.log(`Cloudinary file deleted: ${publicId}`);
    } catch (error) {
      console.error("Failed to delete file from Cloudinary:", error);
      // It's okay to proceed even if deletion fails here, as the note data is removed.
    }
  } else {
    // Local Disk Deletion (Development)
    try {
      await fs.unlink(filePath);
      console.log(`Local file deleted: ${filePath}`);
    } catch (error) {
      // File not found might happen if an old path is referenced
      if (error.code !== "ENOENT") {
        console.error("Failed to delete local file:", error);
      }
    }
  }
};

// Create Note
const createNote = catchAsync(async (req, res, next) => {
  // 1. INPUT: Get raw content from the client.
  const { title, markdownContent } = req.body;

  // 2. Attachments data must come from the file upload middleware (req.files)
  //    We check if req.files exists (meaning Multer ran successfully)
  const attachments = req.files
    ? req.files.map((file) => {
        return {
          originalName: file.originalname,
          uploadedFileName: file.filename, //The unique file name on the server
          mimeTyepe: file.mimetype,
          filePath: file.path, //Path where the file is stored
          size: file.size, //File size in bytes
        };
      })
    : []; // If no files were attached, it's an empty array;

  if (!title || !markdownContent) {
    return next(new AppError("Title and content are required", 400));
  }

  // 3. CRITICAL: GENERATE THE HTML CONTENT ON THE SERVER
  const htmlContent = marked.parse(markdownContent);

  // 4. Create the new note document, saving the server-generated HTML
  const newNote = await Note.create({
    title,
    markdownContent,
    htmlContent,
    attachments,
  });

  res.status(201).json({
    status: "success",
    data: { note: newNote },
  });
});

// check grammar
const checkGrammar = catchAsync(async (req, res, next) => {
  const ID = req.params.id;
  const note = await Note.findById(ID);
  if (!note) {
    return next(new AppError("No note found with that ID", 404));
  }
  const { markdownContent } = note;
  if (!markdownContent) {
    return next(new AppError("No content to check", 400));
  }
  const response = await axios.post(
    "https://api.languagetoolplus.com/v2/check",
    null,
    {
      params: {
        text: markdownContent,
        language: "en-US",
      },
    }
  );
  const errors = response.data.matches.map((match) => ({
    message: match.message,
    offset: match.offset,
    length: match.length,
    context: match.context.text,
    suggestions: match.replacements.map((r) => r.value).slice(0, 3), // Top 3 suggestions
    type: match.rule.issueType, // grammar, typo, style, etc.
  }));

  res.json({
    status: "success",
    data: {
      errorCount: errors.length,
      errors: errors,
    },
  });
});

//Get all notes
const getAllNotes = catchAsync(async (req, res, next) => {
  const notes = await Note.find();
  if (!notes) {
    return next(new AppError("No notes found", 404));
  }
  res.status(200).json({
    status: "success",
    results: notes.length,
    data: { notes },
  });
});
// Return HTML content for a note
// (This function is not currently used in routes, but could be useful for future features)
const getNoteHtmlContent = catchAsync(async (req, res, next) => {
  const ID = req.params.id;
  const note = await Note.findById(ID);
  if (!note) {
    return next(new AppError("No note found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: { htmlContent: note.htmlContent },
  });
});

// Get a single note by ID
const getNoteById = catchAsync(async (req, res, next) => {
  const ID = req.params.id;
  const note = await Note.findById(ID);
  if (!note) {
    return next(new AppError("No note found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: { note },
  });
});

// Edit Note

// controller/noteController.js - improved editNote
const editNote = catchAsync(async (req, res, next) => {
  const ID = req.params.id;

  // Parse removeAttachments if it's a string (from form-data)
  let removeAttachments = req.body.removeAttachments;
  if (typeof removeAttachments === "string") {
    try {
      removeAttachments = JSON.parse(removeAttachments);
    } catch (e) {
      return next(new AppError("Invalid removeAttachments format", 400));
    }
  }

  const { title, markdownContent } = req.body;

  if (!title || !markdownContent) {
    return next(new AppError("Title and content are required", 400));
  }

  // 1. Find the existing note
  const note = await Note.findById(ID);
  if (!note) {
    return next(new AppError("No note found with that ID", 404));
  }

  // 2. Handle attachment removal
  let updatedAttachments = [...note.attachments];

  if (removeAttachments && Array.isArray(removeAttachments)) {
    updatedAttachments = updatedAttachments.filter((attachment) => {
      const shouldRemove = removeAttachments.includes(
        attachment._id.toString()
      );

      if (shouldRemove) {
        deleteFile(attachment.filePath);
      }

      return !shouldRemove;
    });
  }

  // 3. Add new attachments if any were uploaded
  if (req.files && req.files.length > 0) {
    const newAttachments = req.files.map((file) => ({
      originalName: file.originalname,
      uploadedFileName: file.filename,
      mimeType: file.mimetype,
      filePath: file.path,
      size: file.size,
    }));

    updatedAttachments = [...updatedAttachments, ...newAttachments];
  }

  // 4. Update the note
  const htmlContent = marked.parse(markdownContent);

  const updatedNote = await Note.findByIdAndUpdate(
    ID,
    {
      title,
      markdownContent,
      htmlContent,
      attachments: updatedAttachments,
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: { note: updatedNote },
  });
});

// delete Note
// Inside controller/noteController.js

// delete Note
const deleteNote = catchAsync(async (req, res, next) => {
  const id = req.params.id;

  // 1. Find the note to get attachment info BEFORE deletion
  const note = await Note.findById(id);

  if (!note) {
    return next(new AppError("No note found with that ID", 404));
  }

  // 2. Delete the note from the database
  await Note.findByIdAndDelete(id);

  // 3. Delete associated files from storage
  if (note.attachments && note.attachments.length > 0) {
    // Use Promise.all to delete files in parallel
    await Promise.all(
      note.attachments.map((attachment) => deleteFile(attachment.filePath))
    );
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
// Export all controller functions
module.exports = {
  createNote,
  getAllNotes,
  checkGrammar,
  getNoteById,
  getNoteHtmlContent,
  deleteFile,
  editNote,
  deleteNote,
};
