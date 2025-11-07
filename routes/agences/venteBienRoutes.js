// routes/agences/venteBienRoutes.js
const express = require("express");
const router = express.Router();
const venteBienController = require("../../controllers/agences/venteBienController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes pour récupérer les ventes selon le rôle
router.get("/commercial", authorizeRoles("Commercial"), venteBienController.getMesVentesCommercial);
router.get("/client", authorizeRoles("User"), venteBienController.getMesVentesClient);
router.get("/agence", authorizeRoles("Agence", "Admin"), venteBienController.getMesVentesAgence);

// Route pour récupérer une vente spécifique (accessible par commercial, client ou agence)
router.get("/:id", authorizeRoles("Commercial", "User", "Agence", "Admin"), venteBienController.getVenteById);

// Route pour signer la vente (accessible par commercial, client ou agence)
router.post("/:id/signature", authorizeRoles("Commercial", "User", "Agence"), venteBienController.signerVente);

// Route pour finaliser la vente et transférer l'argent (accessible par Admin ou Agence)
router.post("/:id/finaliser", authorizeRoles("Admin", "Agence"), venteBienController.finaliserVenteAvecTransfert);

module.exports = router;

