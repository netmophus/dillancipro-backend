// routes/notaire/venteRoutes.js
const express = require("express");
const router = express.Router();
const venteController = require("../../controllers/notaire/venteController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const { uploadGeneric } = require("../../middlewares/uploadGeneric");

// Toutes les routes nécessitent l'authentification et le rôle Notaire
router.use(authMiddleware);
router.use(authorizeRoles("Notaire"));

// ⚠️ IMPORTANT: Routes spécifiques AVANT les routes génériques
// Routes pour les ventes de parcelles (DOIT être avant les routes génériques)
router.get("/parcelles", venteController.getMesVentesParcelles);
router.get("/parcelles/:id", venteController.getVenteParcelleById);
router.put("/parcelles/:id/statut", venteController.updateStatutParcelle);
router.put("/parcelles/:id/finaliser", venteController.finaliserVenteParcelle);

// Routes pour les ventes de biens immobiliers (routes génériques en dernier)
router.get("/", venteController.getMesVentes);
router.get("/:id", venteController.getVenteById);
router.put("/:id/statut", venteController.updateStatut);
router.post("/:id/documents", uploadGeneric[0], uploadGeneric[1], venteController.uploadDocument);
router.delete("/:id/documents/:docId", venteController.deleteDocument);
router.put("/:id/finaliser", venteController.finaliserVente);

module.exports = router;

