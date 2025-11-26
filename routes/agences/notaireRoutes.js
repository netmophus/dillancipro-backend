// routes/agences/notaireRoutes.js
const express = require("express");
const router = express.Router();
const { getNotairesActifs, getNotairesActifsPublic } = require("../../controllers/agences/notaireController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

// Route publique pour récupérer les notaires actifs (accessible à tous)
router.get("/public", getNotairesActifsPublic);

// Route pour récupérer les notaires actifs (accessible aux commerciaux, agences, banques et admin)
router.get(
  "/actifs",
  authMiddleware,
  authorizeRoles("Commercial", "Agence", "Admin", "Banque"),
  getNotairesActifs
);

module.exports = router;

