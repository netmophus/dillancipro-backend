// middlewares/uploadLotissements.js
// Multer en mémoire puis envoi vers Cloudinary. Utilisé sur POST et PUT.
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const parseForm = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Format non accepté (JPEG, PNG ou WebP uniquement)")),
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([{ name: "images", maxCount: 20 }]);

function uploadBuffer(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(file.buffer);
  });
}

module.exports = (req, res, next) => {
  parseForm(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: "Fichiers invalides ou trop volumineux", error: err.message });
    }
    try {
      const imgs = Array.isArray(req.files?.images) ? req.files.images : [];
      const urls = await Promise.all(imgs.map((f) => uploadBuffer(f, "agences/lotissements/images")));
      req.cloudinary = { images: urls };
      return next();
    } catch (e) {
      console.error("[UPLOAD_LOTISSEMENTS] Erreur:", e.message);
      return res.status(500).json({ message: "Échec d'upload des images vers Cloudinary" });
    }
  });
};
