const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const sessionTracker = require("../middlewares/sessionTracker");
const uploadProfilePhoto = require("../middlewares/uploadProfilePhoto");

const {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} = require("../controllers/userProfileController");

// 👤 Créer un profil utilisateur (appelé après inscription)
router.post(
  "/profile",
  authMiddleware,
  sessionTracker,
  uploadProfilePhoto,
  createUserProfile
);

// 🔎 Obtenir le profil de l'utilisateur connecté
router.get(
  "/profile",
  authMiddleware,
  sessionTracker,
  getUserProfile
);

// ✏️ Mettre à jour le profil utilisateur
router.put(
  "/profile",
  authMiddleware,
  sessionTracker,
  uploadProfilePhoto,
  updateUserProfile
);

module.exports = router;
