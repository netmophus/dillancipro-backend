// routes/agences/locationRoutes.js
const express = require("express");
const router = express.Router();
const { authMiddleware, authorizeRoles, handleLocationImageUpload } = require("../../middlewares");
const {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  getLocationStats,
  searchLocations,
  getAllPublicLocations,
  planifierVisite,
  faireDemande
} = require("../../controllers/agences/locationController");

// Routes pour les agences et admin (authentification requise)
router.post("/", authMiddleware, authorizeRoles("Agence", "Admin"), handleLocationImageUpload, createLocation);
router.get("/", authMiddleware, authorizeRoles("Agence", "Admin"), getAllLocations);
router.get("/stats", authMiddleware, authorizeRoles("Agence", "Admin"), getLocationStats);

// Routes publiques (SANS authentification) - DOIT être AVANT les routes avec paramètres
router.get("/public/search", searchLocations);
router.get("/public", getAllPublicLocations);

// Routes avec paramètres (DOIT être APRÈS les routes publiques)
router.get("/edit/:id", authMiddleware, authorizeRoles("Agence", "Admin"), getLocationById);
router.get("/:id", authMiddleware, authorizeRoles("Agence", "Admin"), getLocationById);
router.put("/:id", authMiddleware, authorizeRoles("Agence", "Admin"), handleLocationImageUpload, updateLocation);
router.delete("/:id", authMiddleware, authorizeRoles("Agence"), deleteLocation);

// Routes pour les clients (authentification requise)
router.post("/:id/visite", authMiddleware, authorizeRoles("Client"), planifierVisite);
router.post("/:id/demande", authMiddleware, authorizeRoles("Client"), faireDemande);

module.exports = router;
