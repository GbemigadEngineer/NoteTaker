const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// 1. Define Storage engines

let storage;

if (process.env.NODE_ENV === "production") {
  // Use cloudinary Storage
  cloudinary.config({
    secure: true, // Ensure secure URLs by using HTTPS
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "markdown-notes-attachements", // Folder name in cloudinary
      // note to self:  don't need custom filename logic here; Cloudinary handles
      // unique ID generation automatically.
      public_id: (req, file) => file.fieldname + "-" + Date.now(),
    },
  });
} else {
  // In development: Use Local Disk Storage
  storage = multer.diskStorage({
    // 1. Destination folder must be created
    destination: (req, file, cb) => {
      cb(null, "uploads");
    },
    //2.  File name Logic to avoid name collision
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
  });
}

// 2. File Filter to allow only specific file types (optional)
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    // Reject file
    cb(
      new Error("Invalid file type. Only images and PDFs are allowed."),
      false
    );
  }
};

// Initialize Multer using the selected storage engine
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

// Export the middleware to handle multiple file uploads (up to 5 files)
exports.uploadAttachments = upload.array("attachments", 5);
