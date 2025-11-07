// middlewares/uploadLocations.js
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// Stockage en mémoire (les buffers sont envoyés vers Cloudinary)
const storage = multer.memoryStorage();

// Autoriser uniquement les images
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/gif",
]);

const fileFilter = (_, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Seules les images (JPEG, PNG, WEBP, GIF) sont autorisées"), false);
  }
  cb(null, true);
};

const parseForm = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max par fichier
    files: 8,
  },
}).array("images", 8);

function uploadBufferToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "agences/locations/images",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

const uploadLocationImages = (req, res, next) => {
  parseForm(req, res, async (err) => {
    if (err) {
      console.error("❌ [UPLOAD_LOCATIONS] Multer error:", err);
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "Chaque image doit faire moins de 5MB"
        : err.message || "Erreur lors de l'upload des images";
      return res.status(400).json({ message });
    }

    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      console.log("ℹ️ [UPLOAD_LOCATIONS] Aucun fichier image fourni");
      req.cloudinary = { ...(req.cloudinary || {}), images: [] };
      return next();
    }

    try {
      console.log(`📤 [UPLOAD_LOCATIONS] Upload de ${files.length} image(s) vers Cloudinary...`);

      const uploadedImages = await Promise.all(files.map(uploadBufferToCloudinary));

      req.cloudinary = {
        ...(req.cloudinary || {}),
        images: uploadedImages,
      };

      console.log("✅ [UPLOAD_LOCATIONS] Upload réussi", {
        count: uploadedImages.length,
        firstUrl: uploadedImages[0]?.url,
      });

      return next();
    } catch (error) {
      console.error("❌ [UPLOAD_LOCATIONS] Erreur Cloudinary:", error);
      return res.status(500).json({
        message: "Échec de l'upload des images vers Cloudinary",
        error: error.message,
      });
    }
  });
};

module.exports = { uploadLocationImages };
