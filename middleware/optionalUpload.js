// middleware/optionalUpload.js
const { uploadAttachments } = require("./upload");

const optionalUpload = (req, res, next) => {
  const contentType = req.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    return uploadAttachments(req, res, next);
  }

  next();
};

module.exports = optionalUpload;
