// middlewares/uploadWrapper.js
// Wrapper pour simplifier l'utilisation des middlewares d'upload

const { uploadLocationImages } = require("./uploadLocations");

/**
 * Middleware wrapper pour l'upload d'images de locations
 * Gère automatiquement les erreurs d'upload
 */
const handleLocationImageUpload = (req, res, next) => {
  console.log("📤 [UPLOAD_WRAPPER] Début upload images location");
  uploadLocationImages(req, res, (middlewareError) => {
    if (middlewareError) {
      console.error("❌ [UPLOAD_WRAPPER] Erreur upload images location:", middlewareError);
      return res.status(400).json({
        message: "Erreur lors de l'upload des images",
        error: middlewareError.message,
      });
    }

    const uploadedCount = req.cloudinary?.images?.length ?? 0;
    console.log("📤 [UPLOAD_WRAPPER] Upload terminé, images Cloudinary:", uploadedCount);
    next();
  });
};

module.exports = {
  handleLocationImageUpload,
};
