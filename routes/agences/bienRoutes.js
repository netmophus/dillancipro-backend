// routes/agences/bienRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const uploadBiens = require("../../middlewares/uploadBiens"); // Middleware pour photos et vidéos

const {
  createBien,
  getAllBiens,
  getBienById,
  updateBien,
  deleteBien,
  affecterBien,
  getBiensStats,
} = require("../../controllers/agences/bienController");

// Statistiques (avant les routes avec :id)
router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("Agence"),
  getBiensStats
);

// CRUD des biens
router.post(
  "/",
  authMiddleware,
  authorizeRoles("Agence"),
  uploadBiens, // Pour gérer images, vidéos et documents
  createBien
);

router.get(
  "/",
  authMiddleware,
  authorizeRoles("Agence", "Commercial"),
  getAllBiens
);

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("Agence", "Commercial"),
  getBienById
);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("Agence"),
  uploadBiens,
  updateBien
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("Agence"),
  deleteBien
);

// Affectation
router.put(
  "/:id/affecter",
  authMiddleware,
  authorizeRoles("Agence"),
  affecterBien
);

module.exports = router;

