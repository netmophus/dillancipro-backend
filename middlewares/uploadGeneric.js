// middlewares/uploadGeneric.js
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { v4: uuidv4 } = require("uuid");

const storage = multer.memoryStorage();

const OK = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", 
  "image/png", 
  "image/webp", 
  "image/gif"
]);

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    if (!OK.has(file.mimetype)) {
      return cb(new Error("Type de fichier non autorisé"));
    }
    cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo
}).single("file");

function uploadBufferToCloudinary(buffer, folder, mimetype) {
  return new Promise((resolve, reject) => {
    const resource_type = mimetype.startsWith("image/") ? "image" : "raw";
    
    const uploadOptions = {
      folder,
      resource_type,
      public_id: uuidv4(),
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
}

async function toCloudinary(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    // Récupérer le type depuis les query params ou body
    const type = req.query.type || req.body.type || "verification-documents";
    
    console.log("📤 [UPLOAD] Type:", type);
    console.log("📤 [UPLOAD] Fichier:", req.file.originalname);

    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      type, // Utiliser le type fourni
      req.file.mimetype
    );

    req.cloudinary = uploadResult;
    return next();
  } catch (e) {
    console.error("❌ uploadGeneric.toCloudinary:", e);
    return res.status(500).json({ message: "Upload Cloudinary échoué" });
  }
}

module.exports = { uploadGeneric: [upload, toCloudinary] };

