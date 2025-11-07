
const multer = require("multer");
const cloudinary = require("../config/cloudinary"); // <= utilise le module configuré

// Multer en mémoire (on envoie les buffers à Cloudinary)
const storage = multer.memoryStorage();

const ok = new Set([
  "image/jpeg","image/png","image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const fileFilter = (_, file, cb) => cb(null, ok.has(file.mimetype));

const parseForm = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "images", maxCount: 20 },
  { name: "documents", maxCount: 20 },
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
      console.error("❌ [UPLOAD_PARCELLES] Multer error:", err);
      return res.status(400).json({ message: "Fichiers invalides ou trop volumineux", error: err.message });
    }

    try {
      const imgs = Array.isArray(req.files?.images) ? req.files.images : [];
      const docs = Array.isArray(req.files?.documents) ? req.files.documents : [];

      console.log("📝 [UPLOAD_PARCELLES] Fichiers reçus - Images:", imgs.length, "Documents:", docs.length);

      // 2) Upload Cloudinary en parallèle (seulement s'il y a des fichiers)
      let uploadedImages = [];
      let uploadedDocs = [];

      if (imgs.length > 0) {
        try {
          uploadedImages = await Promise.all(
            imgs.map((f) => uploadBuffer(f, "agences/parcelles/images"))
          );
          console.log("✅ [UPLOAD_PARCELLES] Images uploadées:", uploadedImages.length);
        } catch (imgError) {
          console.error("❌ [UPLOAD_PARCELLES] Erreur upload images:", imgError);
          return res.status(500).json({ 
            message: "Échec d'upload des images vers Cloudinary", 
            error: imgError.message 
          });
        }
      }

      if (docs.length > 0) {
        try {
          uploadedDocs = await Promise.all(
            docs.map((f) => uploadBuffer(f, "agences/parcelles/documents"))
          );
          console.log("✅ [UPLOAD_PARCELLES] Documents uploadés:", uploadedDocs.length);
        } catch (docError) {
          console.error("❌ [UPLOAD_PARCELLES] Erreur upload documents:", docError);
          return res.status(500).json({ 
            message: "Échec d'upload des documents vers Cloudinary", 
            error: docError.message 
          });
        }
      }

      // 3) Stocker les URLs Cloudinary pour le controller (toujours créer l'objet même si vide)
      req.cloudinary = {
        images: uploadedImages.map((i) => i.url),
        documents: uploadedDocs.map((d) => d.url),
      };

      console.log("📝 [UPLOAD_PARCELLES] Cloudinary configuré - Images:", req.cloudinary.images.length, "Documents:", req.cloudinary.documents.length);

      return next();
    } catch (e) {
      console.error("❌ [UPLOAD_PARCELLES] Erreur générale:", e);
      console.error("❌ [UPLOAD_PARCELLES] Stack:", e.stack);
      return res.status(500).json({ 
        message: "Erreur lors du traitement des fichiers", 
        error: e.message 
      });
    }
  });
};
