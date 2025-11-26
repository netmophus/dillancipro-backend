// middlewares/uploadIHEMedia.js
// Middleware pour uploader les photos et documents des IHE vers Cloudinary
// Organisation: banque/ihe/photos/ et banque/ihe/documents/

const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// Stockage en mémoire (les buffers sont envoyés vers Cloudinary)
const storage = multer.memoryStorage();

// Types de fichiers autorisés
const PHOTO_MIMETYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DOCUMENT_MIMETYPES = new Set([
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain", // .txt
]);

// Configuration Multer pour un seul fichier
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const mimetype = file.mimetype;
    
    // Vérifier si c'est une photo ou un document selon le type dans le body
    const mediaType = req.body.mediaType || req.query.mediaType; // 'photo' ou 'document'
    
    if (mediaType === "photo") {
      if (!PHOTO_MIMETYPES.has(mimetype)) {
        return cb(new Error("Type de fichier non autorisé pour les photos. Formats acceptés: JPEG, PNG, WebP, GIF"));
      }
    } else if (mediaType === "document") {
      if (!DOCUMENT_MIMETYPES.has(mimetype)) {
        return cb(new Error("Type de fichier non autorisé pour les documents. Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, TXT"));
      }
    } else {
      // Si le type n'est pas spécifié, vérifier les deux
      if (!PHOTO_MIMETYPES.has(mimetype) && !DOCUMENT_MIMETYPES.has(mimetype)) {
        return cb(new Error("Type de fichier non autorisé"));
      }
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 Mo max
  },
}).single("file");

/**
 * Upload un buffer vers Cloudinary avec un nom explicite et un dossier organisé
 * @param {Buffer} buffer - Le buffer du fichier
 * @param {String} mediaType - 'photo' ou 'document'
 * @param {String} originalName - Nom original du fichier
 * @param {String} iheId - ID de l'IHE (optionnel, pour organisation)
 * @param {String} banqueId - ID de la banque (optionnel, pour organisation)
 * @returns {Promise<Object>} { url, public_id, resource_type }
 */
function uploadBufferToCloudinary(buffer, mediaType, originalName, mimetype, iheId = null, banqueId = null) {
  return new Promise((resolve, reject) => {
    // Déterminer le type de ressource Cloudinary
    // mediaType est "photo" ou "document", pas un mimetype
    const resource_type = mediaType === "photo" ? "image" : "raw";
    
    // Construire le nom du fichier explicite
    const fileExtension = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, fileExtension)
      .replace(/[^a-zA-Z0-9-_]/g, "_") // Remplacer les caractères spéciaux
      .substring(0, 50); // Limiter la longueur
    
    // Générer un nom unique et explicite
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const explicitFileName = `${baseName}_${timestamp}_${uniqueId}${fileExtension}`;
    
    // Construire le chemin du dossier dans Cloudinary
    // Structure: banque/ihe/{photos|documents}/{banqueId}/{iheId}/
    let folderPath = "banque/ihe";
    
    if (mediaType === "photo") {
      folderPath += "/photos";
    } else if (mediaType === "document") {
      folderPath += "/documents";
    } else {
      // Auto-détection basée sur le mimetype
      folderPath += resource_type === "image" ? "/photos" : "/documents";
    }
    
    // Ajouter l'ID de la banque si disponible
    if (banqueId) {
      folderPath += `/banque_${banqueId}`;
    }
    
    // Ajouter l'ID de l'IHE si disponible
    if (iheId) {
      folderPath += `/ihe_${iheId}`;
    }
    
    // Options d'upload Cloudinary
    const uploadOptions = {
      folder: folderPath,
      resource_type: resource_type,
      public_id: explicitFileName, // Nom explicite du fichier
      use_filename: false, // Ne pas utiliser le nom original
      unique_filename: false, // On gère nous-mêmes l'unicité
      overwrite: false, // Ne pas écraser les fichiers existants
    };
    
    // Pour les images, ajouter des transformations optionnelles
    if (resource_type === "image") {
      uploadOptions.quality = "auto:good"; // Optimisation automatique
      uploadOptions.fetch_format = "auto"; // Format optimal selon le navigateur
    }
    
    console.log(`📤 [UPLOAD_IHE_MEDIA] Upload vers Cloudinary:`);
    console.log(`   - Type: ${mediaType}`);
    console.log(`   - Dossier: ${folderPath}`);
    console.log(`   - Nom fichier: ${explicitFileName}`);
    console.log(`   - Taille: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (err, result) => {
        if (err) {
          console.error("❌ [UPLOAD_IHE_MEDIA] Erreur Cloudinary:", err);
          return reject(err);
        }
        
        console.log(`✅ [UPLOAD_IHE_MEDIA] Upload réussi:`);
        console.log(`   - URL: ${result.secure_url}`);
        console.log(`   - Public ID: ${result.public_id}`);
        
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          folder: folderPath,
          originalName: originalName,
          size: buffer.length,
        });
      }
    );
    
    stream.end(buffer);
  });
}

/**
 * Middleware principal pour uploader les médias IHE
 */
async function uploadIHEMediaToCloudinary(req, res, next) {
  try {
    // Vérifier qu'un fichier a été fourni
    if (!req.file) {
      return res.status(400).json({
        message: "Aucun fichier fourni",
      });
    }
    
    // Récupérer le type de média depuis le body ou query
    const mediaType = req.body.mediaType || req.query.mediaType;
    
    // Si le type n'est pas fourni, le détecter automatiquement
    let detectedType = mediaType;
    if (!detectedType) {
      const mimetype = req.file.mimetype;
      if (PHOTO_MIMETYPES.has(mimetype)) {
        detectedType = "photo";
      } else if (DOCUMENT_MIMETYPES.has(mimetype)) {
        detectedType = "document";
      } else {
        return res.status(400).json({
          message: "Type de média non reconnu. Veuillez spécifier 'photo' ou 'document'",
        });
      }
    }
    
    // Récupérer les IDs optionnels pour l'organisation
    const iheId = req.body.iheId || req.query.iheId || req.params.iheId || null;
    // Utiliser l'ID de l'utilisateur authentifié (banque) pour l'organisation
    const banqueId = req.user?._id?.toString() || req.body.banqueId || req.query.banqueId || null;
    
    // Upload vers Cloudinary
    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      detectedType,
      req.file.originalname,
      req.file.mimetype,
      iheId,
      banqueId
    );
    
    // Stocker le résultat dans req.cloudinary pour le controller
    req.cloudinary = {
      ...(req.cloudinary || {}),
      iheMedia: uploadResult,
      url: uploadResult.url, // Pour compatibilité avec l'ancien système
      public_id: uploadResult.public_id,
    };
    
    console.log(`✅ [UPLOAD_IHE_MEDIA] Média uploadé avec succès pour IHE ${iheId || "nouvelle"}`);
    
    return next();
  } catch (error) {
    console.error("❌ [UPLOAD_IHE_MEDIA] Erreur:", error);
    return res.status(500).json({
      message: "Erreur lors de l'upload vers Cloudinary",
      error: error.message,
    });
  }
}

// Exporter le middleware complet
module.exports = [upload, uploadIHEMediaToCloudinary];

