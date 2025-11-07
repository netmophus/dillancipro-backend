// middlewares/uploadProfilePhoto.js
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { v4: uuidv4 } = require("uuid");

// Configuration Multer pour stocker temporairement en mémoire
const storage = multer.memoryStorage();

// Filter pour n'accepter que les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Type de fichier non supporté. Utilisez JPG, PNG ou WEBP."), false);
  }
};

// Configuration Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
}).single("photo"); // Un seul fichier avec le champ "photo"

// Middleware principal
module.exports = (req, res, next) => {
  upload(req, res, async (err) => {
    // Gestion des erreurs Multer
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "❌ La photo ne doit pas dépasser 5MB" });
      }
      return res.status(400).json({ message: `❌ Erreur upload: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Si pas de fichier, continuer (update sans photo)
    if (!req.file) {
      console.log("ℹ️ [UPLOAD_PROFILE_PHOTO] Pas de photo à uploader");
      return next();
    }

    try {
      console.log("📤 [UPLOAD_PROFILE_PHOTO] Upload photo de profil vers Cloudinary...");
      console.log("📝 [UPLOAD_PROFILE_PHOTO] Fichier:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: `${(req.file.size / 1024).toFixed(2)} KB`,
      });

      // Upload vers Cloudinary
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "users/profile-photos",
            resource_type: "image",
            public_id: `profile_${uuidv4()}`,
            transformation: [
              { width: 500, height: 500, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) {
              console.error("❌ [UPLOAD_PROFILE_PHOTO] Erreur Cloudinary:", error);
              reject(error);
            } else {
              console.log("✅ [UPLOAD_PROFILE_PHOTO] Upload réussi:", result.secure_url);
              resolve(result);
            }
          }
        );

        uploadStream.end(req.file.buffer);
      });

      const result = await uploadPromise;

      // Stocker l'URL dans req.cloudinary
      req.cloudinary = {
        photoUrl: result.secure_url,
        photoPublicId: result.public_id,
      };

      console.log("✅ [UPLOAD_PROFILE_PHOTO] Photo disponible:", req.cloudinary.photoUrl);
      next();
    } catch (error) {
      console.error("❌ [UPLOAD_PROFILE_PHOTO] Erreur lors de l'upload:", error);
      return res.status(500).json({ message: "❌ Erreur lors de l'upload de la photo" });
    }
  });
};

