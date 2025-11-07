// // routes/agences/profilCommercialRoutes.js
// const express = require("express");
// const router = express.Router();
// const fs = require("fs");
// const path = require("path");
// const multer = require("multer");

// const authMiddleware = require("../../middlewares/authMiddleware");
// const { authorizeRoles } = require("../../middlewares/roleMiddleware");

// const {
//   meGetProfil,
//   meUpdateProfil,
//   getProfil,
//   upsertProfil,
//   updateCommission,
//   uploadPhoto,
//   uploadPieceIdentite,
// } = require("../../controllers/agences/profilCommercialController");

// // Multer storage dynamique selon le champ (photo vs pièce)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     let dest = "uploads/commerciaux/others";
//     if (file.fieldname === "photo") dest = "uploads/commerciaux/photos";
//     if (file.fieldname === "pieceFichier") dest = "uploads/commerciaux/identites";
//     fs.mkdirSync(dest, { recursive: true });
//     cb(null, dest);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname || "");
//     cb(null, `${Date.now()}-${file.fieldname}${ext}`);
//   },
// });

// const upload = multer({ storage });

// // Routes "me" en premier (sinon ":id" capture "me")
// router.get(
//   "/me/profil",
//   authMiddleware,
//   authorizeRoles("Commercial"),
//   meGetProfil
// );

// router.patch(
//   "/me/profil",
//   authMiddleware,
//   authorizeRoles("Commercial"),
//   meUpdateProfil
// );

// // Récupérer le profil d'un commercial (Agence & Commercial)
// router.get(
//   "/:id/profil",
//   authMiddleware,
//   authorizeRoles("Agence", "Commercial"),
//   getProfil
// );

// // Upsert profil d'un commercial (Agence)
// router.put(
//   "/:id/profil",
//   authMiddleware,
//   authorizeRoles("Agence"),
//   upsertProfil
// );

// // Mettre à jour la commission (Agence)
// router.patch(
//   "/:id/profil/commission",
//   authMiddleware,
//   authorizeRoles("Agence"),
//   updateCommission
// );

// // Upload photo (Agence & Commercial)
// router.patch(
//   "/:id/profil/photo",
//   authMiddleware,
//   authorizeRoles("Agence", "Commercial"),
//   upload.single("photo"),
//   uploadPhoto
// );

// // Upload pièce d'identité (Agence & Commercial)
// router.patch(
//   "/:id/profil/piece",
//   authMiddleware,
//   authorizeRoles("Agence", "Commercial"),
//   upload.single("pieceFichier"),
//   uploadPieceIdentite
// );

// module.exports = router;






const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

const {
  meGetProfil,
  meUpdateProfil,
  getProfil,
  upsertProfil,
  updateCommission,
  uploadPhoto,
  uploadPieceIdentite,
} = require("../../controllers/agences/profilCommercialController");

const {
  uploadCommercialProfile,
  uploadPhotoOnly,
  uploadPieceOnly,
} = require("../../middlewares/uploadCommercialProfile");

// --- Routes "me"
router.get("/me/profil", authMiddleware, authorizeRoles("Commercial"), meGetProfil);
router.patch("/me/profil", authMiddleware, authorizeRoles("Commercial"), meUpdateProfil);

// --- Récupérer / enregistrer un profil
router.get("/:id/profil", authMiddleware, authorizeRoles("Agence", "Commercial"), getProfil);
router.put("/:id/profil", authMiddleware, authorizeRoles("Agence"), upsertProfil);

// --- Commission
router.patch("/:id/profil/commission", authMiddleware, authorizeRoles("Agence"), updateCommission);

// --- Uploads Cloudinary
router.patch(
  "/:id/profil/photo",
  authMiddleware,
  authorizeRoles("Agence", "Commercial"),
  uploadPhotoOnly,         // ← Cloudinary
  uploadPhoto              // ← controller
);

router.patch(
  "/:id/profil/piece",
  authMiddleware,
  authorizeRoles("Agence", "Commercial"),
  uploadPieceOnly,         // ← Cloudinary
  uploadPieceIdentite      // ← controller
);

module.exports = router;
