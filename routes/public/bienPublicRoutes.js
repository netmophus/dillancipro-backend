// routes/public/bienPublicRoutes.js
// Routes publiques pour la recherche de biens immobiliers (sans authentification)

const express = require("express");
const router = express.Router();
const {
  getPublicBiensSearch,
  getPublicBienFilters,
  getPublicBienStats,
} = require("../../controllers/public/bienPublicController");

// Recherche de biens avec filtres et pagination
router.get("/search", getPublicBiensSearch);

// Route pour obtenir les options de filtres (villes, quartiers, types, agences, etc.)
router.get("/filters", getPublicBienFilters);

// Route pour obtenir les statistiques agrégées (prix min/max/moyen, etc.)
router.get("/stats", getPublicBienStats);

module.exports = router;

