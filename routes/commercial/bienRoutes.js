// routes/commercial/bienRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

const {
  getMesBiensCommercial,
  vendreBien,
  getBienById,
} = require("../../controllers/agences/bienController");

// Récupérer mes biens (biens affectés au commercial)
router.get(
  "/mes-biens",
  authMiddleware,
  authorizeRoles("Commercial"),
  getMesBiensCommercial
);

// Voir détails d'un bien
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("Commercial"),
  getBienById
);

// Vendre un bien
router.put(
  "/:id/vendre",
  authMiddleware,
  authorizeRoles("Commercial"),
  vendreBien
);

module.exports = router;

