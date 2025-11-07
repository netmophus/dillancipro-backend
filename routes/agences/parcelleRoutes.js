const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // 📌 pour lire les champs `form-data` sans fichier

const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const {
  createParcelle,
  updateParcelle,
  deleteParcelle,
  getAllParcelles,
  createParcellesBatch,
  createParcellesBatchIndividual,
  getParcelleById,
} = require("../../controllers/agences/parcelleController");
const uploadParcelles = require("../../middlewares/uploadParcelles");
const uploadParcellesIndividual = require("../../middlewares/uploadParcellesIndividual");
// ➕ Créer une parcelle
// router.post("/", authMiddleware, authorizeRoles("Agence"), createParcelle);

// router.post("/parcelles", authMiddleware, authorizeRoles("Agence"), upload.any(), createParcelle);

// routes/agences/parcelleRoutes.js (extrait)


// routes/agences/parcelleRoutes.js
router.post(
  "/parcelles",
  authMiddleware,
  authorizeRoles("Agence"),
  uploadParcelles,   // ← garde ce nom, on a remplacé son contenu
  createParcelle
);





// router.post("/parcelles/batch", authMiddleware, authorizeRoles("Agence"), createParcellesBatch);




router.post(
  "/parcelles/batch",
  authMiddleware,
  authorizeRoles("Agence"),
  uploadParcelles,           // ← AJOUT : pour peupler req.cloudinary.images / .documents
  createParcellesBatch
);

// Route pour créer parcelles avec coordonnées et photos individuelles
router.post(
  "/parcelles/batch-individual",
  authMiddleware,
  authorizeRoles("Agence"),
  uploadParcellesIndividual, // Middleware spécial pour images par parcelle
  createParcellesBatchIndividual
);

router.get("/", authMiddleware, authorizeRoles("Agence", "Admin"), getAllParcelles);

// ✏️ Modifier une parcelle
// router.put("/:id", authMiddleware, authorizeRoles("Agence"), updateParcelle);
// routes/agences/parcellesRoutes.js (exemple)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("Agence"),
    uploadParcelles,            // 👈 pour ajouter des fichiers et/ou MAJ données
  updateParcelle
);


// ❌ Supprimer une parcelle
router.delete("/:id", authMiddleware, authorizeRoles("Agence"), deleteParcelle);


// 📄 Route : routes/commercial/parcelleRoutes.js
router.get("/parcelle/:id", authMiddleware, authorizeRoles("Commercial"), getParcelleById);


module.exports = router;
