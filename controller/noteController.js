"use strict";
const Note = require("../model/noteModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const marked = require("marked");

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

// Export all controller functions
module.exports = {
  createNote,
};
