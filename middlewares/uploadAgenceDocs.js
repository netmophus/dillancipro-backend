// middlewares/uploadAgenceDocs.js
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const fileFilter = (_, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Type de fichier non autorisé"), false);
  }
  cb(null, true);
};

const parseForm = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
}).fields([
  { name: "nifFile", maxCount: 1 },
  { name: "rccmFile", maxCount: 1 },
  { name: "statutFile", maxCount: 1 },
  { name: "autresFichiers", maxCount: 5 },
  { name: "logo", maxCount: 1 },
]);

const folderMap = {
  nifFile: "agences/documents/nif",
  rccmFile: "agences/documents/rccm",
  statutFile: "agences/documents/statut",
  autresFichiers: "agences/documents/autres",
  logo: "agences/documents/logo",
};

const uploadSingleBuffer = (file, folder) => {
  return new Promise((resolve, reject) => {
    const resourceType = file.mimetype.startsWith("image/") ? "image" : "raw";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          bytes: result.bytes,
          format: result.format,
          original_filename: result.original_filename,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

const uploadAgenceDocs = (req, res, next) => {
  parseForm(req, res, async (err) => {
    if (err) {
      console.error("❌ [UPLOAD_AGENCE_DOCS] Multer error:", err);
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "Chaque fichier doit faire moins de 15MB"
        : err.message || "Erreur lors de l'upload des documents";
      return res.status(400).json({ message });
    }

    if (!req.files) {
      return next();
    }

    try {
      const cloudinaryDocs = {};

      for (const field of Object.keys(req.files)) {
        const folder = folderMap[field] || "agences/documents/autres";
        const files = req.files[field];

        if (!Array.isArray(files) || files.length === 0) {
          continue;
        }

        if (field === "autresFichiers") {
          cloudinaryDocs.autresFichiers = await Promise.all(
            files.map((file) => uploadSingleBuffer(file, folder))
          );
        } else {
          const uploadResult = await uploadSingleBuffer(files[0], folder);
          cloudinaryDocs[field] = uploadResult;
        }
      }

      req.cloudinaryDocs = cloudinaryDocs;
      req.cloudinary = {
        ...(req.cloudinary || {}),
        agenceDocs: cloudinaryDocs,
      };

      console.log("✅ [UPLOAD_AGENCE_DOCS] Upload Cloudinary terminé", {
        fields: Object.keys(cloudinaryDocs),
      });

      return next();
    } catch (error) {
      console.error("❌ [UPLOAD_AGENCE_DOCS] Erreur Cloudinary:", error);
      return res.status(500).json({
        message: "Échec de l'upload vers Cloudinary",
        error: error.message,
      });
    }
  });
};

module.exports = uploadAgenceDocs;
