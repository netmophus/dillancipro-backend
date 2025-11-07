const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const {
  creerEcheancier,
  getEcheancierById,
  getEcheanciersCommercial,
  getEcheanciersClient,
  getEcheanciersAgence,
  getEcheancierByPaiement,
  modifierEcheancier,
  marquerEcheancePayee,
  rembourserClient,
} = require("../../controllers/agences/echeancierController");

// Routes pour les commerciaux
router.post(
  "/",
  authMiddleware,
  authorizeRoles("Commercial", "Admin"),
  creerEcheancier
);

router.get(
  "/commercial",
  authMiddleware,
  authorizeRoles("Commercial", "Admin"),
  getEcheanciersCommercial
);

router.get(
  "/agence",
  authMiddleware,
  authorizeRoles("Agence", "Admin"),
  getEcheanciersAgence
);

router.get(
  "/paiement/:paiementId",
  authMiddleware,
  authorizeRoles("Commercial", "User", "Agence", "Admin"),
  getEcheancierByPaiement
);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("Commercial", "Agence", "Admin"),
  modifierEcheancier
);

router.put(
  "/:id/echeance/:echeanceId/payer",
  authMiddleware,
  authorizeRoles("Commercial", "Admin"),
  marquerEcheancePayee
);

// Route pour rembourser le client et remettre en vente
router.post(
  "/:id/rembourser",
  authMiddleware,
  authorizeRoles("Agence", "Admin"),
  rembourserClient
);

// Routes pour les clients
router.get(
  "/client",
  authMiddleware,
  authorizeRoles("User", "Admin"),
  getEcheanciersClient
);

// Route commune pour récupérer un échéancier par ID
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("Commercial", "User", "Agence", "Admin"),
  getEcheancierById
);

module.exports = router;

