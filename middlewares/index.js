// middlewares/index.js
// Fichier d'index pour organiser tous les middlewares

// Middlewares d'authentification et autorisation
const authMiddleware = require("./authMiddleware");
const { authorizeRoles } = require("./roleMiddleware");
const sessionTracker = require("./sessionTracker");
const checkInactivity = require("./checkInactivity");

// Middlewares d'upload spécialisés
const uploadAgenceDocs = require("./uploadAgenceDocs");
const uploadBiens = require("./uploadBiens");
const uploadCommercialProfile = require("./uploadCommercialProfile");
const uploadParcelles = require("./uploadParcelles");
const uploadParcellesIndividual = require("./uploadParcellesIndividual");
const uploadProfilePhoto = require("./uploadProfilePhoto");
const uploadRecuCloudinary = require("./uploadRecuCloudinary");
const uploadGeneric = require("./uploadGeneric");
const { uploadLocationImages } = require("./uploadLocations");
const { handleLocationImageUpload } = require("./uploadWrapper");

module.exports = {
  // Authentification et autorisation
  authMiddleware,
  authorizeRoles,
  sessionTracker,
  checkInactivity,
  
  // Upload spécialisés
  uploadAgenceDocs,
  uploadBiens,
  uploadCommercialProfile,
  uploadParcelles,
  uploadParcellesIndividual,
  uploadProfilePhoto,
  uploadRecuCloudinary,
  uploadGeneric,
  uploadLocationImages,
  handleLocationImageUpload,
};
