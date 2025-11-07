// middlewares/uploadBiens.js
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// Multer en mémoire (on envoie les buffers à Cloudinary)
const storage = multer.memoryStorage();

const ok = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (_, file, cb) => cb(null, ok.has(file.mimetype));

const parseForm = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB pour les images
  },
}).fields([
  { name: "images", maxCount: 5 }, // Maximum 5 photos
  { name: "documents", maxCount: 20 },
]);

function uploadBuffer(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder, 
        resource_type: "auto",
      },
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
      console.error("❌ Multer error:", err);
      return res.status(400).json({ 
        message: err.code === "LIMIT_FILE_SIZE" 
          ? "Fichier trop volumineux (max 100MB)" 
          : "Fichiers invalides ou trop volumineux" 
      });
    }

    try {
      const imgs = Array.isArray(req.files?.images) ? req.files.images : [];
      const docs = Array.isArray(req.files?.documents) ? req.files.documents : [];

      // Validation pour la création de bien
      if (req.method === "POST" && req.path === "/") {
        // Au moins 2 photos requises
        if (imgs.length < 2) {
          return res.status(400).json({ 
            message: "Veuillez ajouter au moins 2 photos de votre bien" 
          });
        }
        // Maximum 5 photos
        if (imgs.length > 5) {
          return res.status(400).json({ 
            message: "Maximum 5 photos autorisées" 
          });
        }
      }

      console.log(`📤 Upload vers Cloudinary: ${imgs.length} images, ${docs.length} documents`);

      // 2) Upload Cloudinary en parallèle
      const [uploadedImages, uploadedDocs] = await Promise.all([
        Promise.all(imgs.map((f) => uploadBuffer(f, "agences/biens/images"))),
        Promise.all(docs.map((f) => uploadBuffer(f, "agences/biens/documents"))),
      ]);

      console.log(`✅ Upload réussi: ${uploadedImages.length} images`);

      // 3) Stocker les URLs Cloudinary pour le controller
      req.cloudinary = {
        images: uploadedImages.map((i) => i.url),
        documents: uploadedDocs.map((d) => d.url),
      };

      return next();
    } catch (e) {
      console.error("❌ Cloudinary upload error:", e);
      return res.status(500).json({ 
        message: "Échec d'upload vers Cloudinary: " + e.message 
      });
    }
  });
};

