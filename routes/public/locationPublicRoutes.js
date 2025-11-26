// routes/public/locationPublicRoutes.js
// Routes publiques pour la recherche de locations (sans authentification)

const express = require("express");
const router = express.Router();
const {
  searchLocations,
  getFilterOptions,
  getStats,
} = require("../../controllers/public/locationPublicController");

// Recherche de locations avec filtres
router.get("/search", searchLocations);

// Récupérer les options de filtres
router.get("/filters", getFilterOptions);

// Récupérer les statistiques
router.get("/stats", getStats);

module.exports = router;

