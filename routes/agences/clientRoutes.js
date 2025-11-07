// routes/agences/clientRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

const {
  getAllClients,
  toggleClientActive,
  updateClient,
  deleteClient,
} = require("../../controllers/agences/clientController");

// Récupérer tous les clients
router.get(
  "/",
  authMiddleware,
  authorizeRoles("Commercial", "Agence"),
  getAllClients
);

// Activer/Désactiver un client
router.patch(
  "/:id/toggle-active",
  authMiddleware,
  authorizeRoles("Commercial", "Agence"),
  toggleClientActive
);

// Modifier un client
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("Commercial", "Agence"),
  updateClient
);

// Supprimer un client
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("Commercial", "Agence"),
  deleteClient
);

module.exports = router;

