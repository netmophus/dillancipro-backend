const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();

const imageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const docMimes   = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/gif"
]);

function fileFilter(req, file, cb) {
  if (file.fieldname === "photo") {
    return cb(null, imageMimes.has(file.mimetype));
  }
  if (file.fieldname === "pieceFichier") {
    return cb(null, docMimes.has(file.mimetype));
  }
  cb(null, false);
}

const baseUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// helper: upload d’un buffer vers Cloudinary
function uploadBufferToCloudinary(buffer, folder, mimetype) {
  return new Promise((resolve, reject) => {
    const resource_type = mimetype.startsWith("image/") ? "image" : "raw"; // PDF => raw
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format,
          resource_type: result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
}

// middleware final qui envoie sur Cloudinary & stocke dans req.cloudinary
async function toCloudinary(req, res, next) {
  try {
    const userId = req.params.id || "unknown";
    req.cloudinary = req.cloudinary || {};

    // Photo
    const photo = req.files?.photo?.[0];
    if (photo?.buffer) {
      const folder = `commerciaux/${userId}/photos`;
      const up = await uploadBufferToCloudinary(photo.buffer, folder, photo.mimetype);
      req.cloudinary.photo = up; // { url, public_id, ... }
    }

    // Pièce d’identité
    const piece = req.files?.pieceFichier?.[0];
    if (piece?.buffer) {
      const folder = `commerciaux/${userId}/identites`;
      const up = await uploadBufferToCloudinary(piece.buffer, folder, piece.mimetype);
      req.cloudinary.pieceFichier = up;
    }

    return next();
  } catch (e) {
    console.error("❌ uploadCommercialProfile.toCloudinary:", e);
    return res.status(500).json({ message: "Upload Cloudinary échoué" });
  }
}

module.exports = {
  // à utiliser avec .fields([...])
  uploadCommercialProfile: [baseUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "pieceFichier", maxCount: 1 },
  ]), toCloudinary],

  // variantes pratiques si tu veux un seul champ
  uploadPhotoOnly: [baseUpload.fields([{ name: "photo", maxCount: 1 }]), toCloudinary],
  uploadPieceOnly: [baseUpload.fields([{ name: "pieceFichier", maxCount: 1 }]), toCloudinary],
};
