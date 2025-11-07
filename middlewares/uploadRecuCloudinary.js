// middlewares/uploadRecuCloudinary.js
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();

const OK = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/gif"
]);

const baseUpload = multer({
  storage,
  fileFilter: (_, file, cb) => cb(null, OK.has(file.mimetype)),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo
}).single("recu"); // <-- le champ du front doit s'appeler 'recu'

function uploadBufferToCloudinary(buffer, folder, mimetype) {
  return new Promise((resolve, reject) => {
    const resource_type = mimetype.startsWith("image/") ? "image" : "raw"; // pdf => raw
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

async function toCloudinary(req, res, next) {
  try {
    req.cloudinary = req.cloudinary || {};
    const parcelleId = req.params.parcelleId || req.params.id || "unknown";

    if (req.file?.buffer) {
      const up = await uploadBufferToCloudinary(
        req.file.buffer,
        `paiements/${parcelleId}/recus`,
        req.file.mimetype
      );
      req.cloudinary.recu = up; // {url, public_id, ...}
    }
    return next();
  } catch (e) {
    console.error("❌ uploadRecuCloudinary.toCloudinary:", e);
    return res.status(500).json({ message: "Upload Cloudinary échoué" });
  }
}

module.exports = { uploadRecuCloudinary: [baseUpload, toCloudinary] };
