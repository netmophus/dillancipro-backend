// middlewares/uploadParcellesIndividual.js
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// Multer en mémoire
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

// Accepter un nombre dynamique de champs images_parcelle_0, images_parcelle_1, etc.
const parseForm = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).any(); // Accepte n'importe quel champ

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
  parseForm(req, res, async (err) => {
    if (err) {
      console.error("❌ [UPLOAD_INDIVIDUAL] Multer error:", err);
      return res.status(400).json({ 
        message: err.code === "LIMIT_FILE_SIZE" 
          ? "Fichier trop volumineux (max 10MB)" 
          : "Fichiers invalides ou trop volumineux" 
      });
    }

    try {
      console.log("📝 [UPLOAD_INDIVIDUAL] Début upload");
      console.log("📝 [UPLOAD_INDIVIDUAL] Body:", req.body);
      console.log("📝 [UPLOAD_INDIVIDUAL] Files reçus:", req.files?.length || 0);
      
      if (req.files && req.files.length > 0) {
        console.log("📝 [UPLOAD_INDIVIDUAL] Détails fichiers:", req.files.map(f => ({ 
          fieldname: f.fieldname, 
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size
        })));
      }

      // Grouper les fichiers par parcelle
      const imagesByParcelle = {};
      const documentsByParcelle = {};

      if (req.files && req.files.length > 0) {
        // Grouper par fieldname (images_parcelle_0, documents_parcelle_0, etc.)
        req.files.forEach((file) => {
          const imageMatch = file.fieldname.match(/images_parcelle_(\d+)/);
          const documentMatch = file.fieldname.match(/documents_parcelle_(\d+)/);
          
          if (imageMatch) {
            const parcelleIndex = parseInt(imageMatch[1]);
            if (!imagesByParcelle[parcelleIndex]) {
              imagesByParcelle[parcelleIndex] = [];
            }
            imagesByParcelle[parcelleIndex].push(file);
          } else if (documentMatch) {
            const parcelleIndex = parseInt(documentMatch[1]);
            if (!documentsByParcelle[parcelleIndex]) {
              documentsByParcelle[parcelleIndex] = [];
            }
            documentsByParcelle[parcelleIndex].push(file);
          }
        });

        console.log("📝 [UPLOAD_INDIVIDUAL] Images groupées par parcelle:", 
          Object.keys(imagesByParcelle).map(k => `Parcelle ${k}: ${imagesByParcelle[k].length} images`)
        );
        console.log("📝 [UPLOAD_INDIVIDUAL] Documents groupés par parcelle:", 
          Object.keys(documentsByParcelle).map(k => `Parcelle ${k}: ${documentsByParcelle[k].length} docs`)
        );

        // Upload images vers Cloudinary pour chaque parcelle
        for (const [parcelleIndex, files] of Object.entries(imagesByParcelle)) {
          console.log(`📤 [UPLOAD_INDIVIDUAL] Upload ${files.length} images pour parcelle ${parcelleIndex}...`);
          
          const uploadedImages = await Promise.all(
            files.map((f) => uploadBuffer(f, "agences/parcelles/images"))
          );
          imagesByParcelle[parcelleIndex] = uploadedImages.map((i) => i.url);
          
          console.log(`✅ [UPLOAD_INDIVIDUAL] Parcelle ${parcelleIndex}: ${imagesByParcelle[parcelleIndex].length} URLs images`);
        }

        // Upload documents vers Cloudinary pour chaque parcelle
        for (const [parcelleIndex, files] of Object.entries(documentsByParcelle)) {
          console.log(`📤 [UPLOAD_INDIVIDUAL] Upload ${files.length} documents pour parcelle ${parcelleIndex}...`);
          
          const uploadedDocs = await Promise.all(
            files.map((f) => uploadBuffer(f, "agences/parcelles/documents"))
          );
          documentsByParcelle[parcelleIndex] = uploadedDocs.map((d) => d.url);
          
          console.log(`✅ [UPLOAD_INDIVIDUAL] Parcelle ${parcelleIndex}: ${documentsByParcelle[parcelleIndex].length} URLs documents`);
        }

        console.log("✅ [UPLOAD_INDIVIDUAL] Upload Cloudinary terminé pour toutes les parcelles");
      } else {
        console.log("ℹ️ [UPLOAD_INDIVIDUAL] Aucun fichier à uploader");
      }

      // Stocker dans req.cloudinary
      req.cloudinary = {
        imagesByParcelle, // { "0": ["url1", "url2"], "1": ["url3"], ... }
        documentsByParcelle, // { "0": ["url1"], "1": ["url2"], ... }
      };

      console.log("📝 [UPLOAD_INDIVIDUAL] req.cloudinary créé:", JSON.stringify(req.cloudinary, null, 2));
      console.log("✅ [UPLOAD_INDIVIDUAL] Middleware terminé, passage au controller");
      
      return next();
    } catch (e) {
      console.error("❌ [UPLOAD_INDIVIDUAL] Cloudinary upload error:", e);
      console.error("❌ [UPLOAD_INDIVIDUAL] Stack:", e.stack);
      return res.status(500).json({ 
        message: "Échec d'upload vers Cloudinary: " + e.message 
      });
    }
  });
};

