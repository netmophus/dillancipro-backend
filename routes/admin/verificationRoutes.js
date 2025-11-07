// routes/admin/verificationRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

const {
  getBiensAVerifier,
  marquerEnCours,
  validerBien,
  rejeterBien,
  getStatsVerification,
  validerPaiementEnregistrement,
} = require("../../controllers/admin/verificationController");

// Toutes les routes sont réservées aux admins
router.use(authMiddleware, authorizeRoles("Admin"));

router.get("/", getBiensAVerifier);
router.get("/stats", getStatsVerification);
router.put("/:id/en-cours", marquerEnCours);
router.put("/:id/valider", validerBien);
router.put("/:id/rejeter", rejeterBien);

// Route pour valider le paiement d'enregistrement en espèces
router.put("/:id/paiement-enregistrement-valider", validerPaiementEnregistrement);

module.exports = router;

