// routes/public/parcellePublicRoutes.js
// Routes publiques pour la recherche de parcelles (sans authentification)

const express = require("express");
const router = express.Router();
const {
  searchParcelles,
  getFilterOptions,
  getStats,
} = require("../../controllers/public/parcellePublicController");

// Recherche de parcelles avec filtres
router.get("/search", searchParcelles);

// Récupérer les options de filtres
router.get("/filters", getFilterOptions);

// Récupérer les statistiques
router.get("/stats", getStats);

module.exports = router;

