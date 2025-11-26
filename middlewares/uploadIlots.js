
const multer = require("multer");
const cloudinary = require("../config/cloudinary"); // <= utilise le module configuré

// Multer en mémoire (on envoie les buffers à Cloudinary)
const storage = multer.memoryStorage();

const ok = new Set([
  "image/jpeg","image/png","image/webp",
]);

const fileFilter = (_, file, cb) => cb(null, ok.has(file.mimetype));

const parseForm = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "images", maxCount: 20 },
]);

function uploadBuffer(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          bytes: result.bytes,
          original_filename: result.original_filename,
        });
      }
    );
    stream.end(file.buffer);
  });
}

module.exports = (req, res, next) => {
  // 1) D'abord, parser le form-data (remplit req.files & req.body)
  parseForm(req, res, async (err) => {
    if (err) {
      console.error("❌ [UPLOAD_ILOTS] Multer error:", err);
      return res.status(400).json({ message: "Fichiers invalides ou trop volumineux", error: err.message });
    }

    try {
      const imgs = Array.isArray(req.files?.images) ? req.files.images : [];

      console.log("📝 [UPLOAD_ILOTS] Fichiers reçus - Images:", imgs.length);

      // 2) Upload Cloudinary en parallèle (seulement s'il y a des fichiers)
      let uploadedImages = [];

      if (imgs.length > 0) {
        try {
          uploadedImages = await Promise.all(
            imgs.map((f) => uploadBuffer(f, "agences/ilots/images"))
          );
          console.log("✅ [UPLOAD_ILOTS] Images uploadées:", uploadedImages.length);
        } catch (imgError) {
          console.error("❌ [UPLOAD_ILOTS] Erreur upload images:", imgError);
          return res.status(500).json({ 
            message: "Échec d'upload des images vers Cloudinary", 
            error: imgError.message 
          });
        }
      }

      // 3) Stocker les URLs Cloudinary pour le controller (toujours créer l'objet même si vide)
      req.cloudinary = {
        images: uploadedImages.map((i) => i.url),
      };

      console.log("📝 [UPLOAD_ILOTS] Cloudinary configuré - Images:", req.cloudinary.images.length);

      return next();
    } catch (e) {
      console.error("❌ [UPLOAD_ILOTS] Erreur générale:", e);
      console.error("❌ [UPLOAD_ILOTS] Stack:", e.stack);
      return res.status(500).json({ 
        message: "Erreur lors du traitement des fichiers", 
        error: e.message 
      });
    }
  });
};

