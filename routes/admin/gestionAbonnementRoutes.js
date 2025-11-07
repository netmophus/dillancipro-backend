// routes/admin/gestionAbonnementRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

const {
  getBiensAbonnementExpire,
  getBiensAbonnementExpireBientot,
  desactiverBien,
  reactiverBien,
  enregistrerPaiementAbonnement,
  getStatsAbonnements,
  validerAbonnement,
} = require("../../controllers/admin/gestionAbonnementController");

// Toutes les routes sont réservées aux admins
router.use(authMiddleware, authorizeRoles("Admin"));

router.get("/expires", getBiensAbonnementExpire);
router.get("/expire-bientot", getBiensAbonnementExpireBientot);
router.get("/stats", getStatsAbonnements);
router.post("/:id/desactiver", desactiverBien);
router.post("/:id/reactiver", reactiverBien);
router.post("/:id/payer-abonnement", enregistrerPaiementAbonnement);

// Route pour valider l'abonnement directement (paiement espèces)
router.put("/:id/abonnement-valider", validerAbonnement);

module.exports = router;

