// const express = require("express");
// const router = express.Router();
// const { register, login, getProfile, logout, getSessions } = require("../controllers/authcontroller");
// const authMiddleware = require("../middlewares/authMiddleware"); // Ensure you have this middleware

// // Registration and login routes
// router.post("/register", register);
// router.post("/login", login);



// // Route de logout
// router.post("/logout", authMiddleware, logout);


// // Route pour récupérer les sessions (accessible aux admins uniquement, par exemple)
// router.get("/sessions", authMiddleware, getSessions);


// // Protected route to get the user's profile (name and role)
// router.get("/profile", authMiddleware, getProfile);

// module.exports = router;





const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const sessionTracker = require("../middlewares/sessionTracker");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const {
  updateTrackSessions,
  updateUserActiveStatus,
  getAllUsers,
  

} = require("../controllers/userController");


const { 
  login, 
  register, 
  registerClient,
  requestPasswordReset,
  verifyResetCode,
  resetPassword
} = require("../controllers/authController");



const User = require("../models/User");
const UserProfile = require("../models/UserProfile");

router.get(
  "/client/by-phone/:phone",
  authMiddleware,
  authorizeRoles("Commercial"),
  async (req, res) => {
    try {
      const phone = req.params.phone;
      console.log("🔍 [RECHERCHE_CLIENT] Recherche par téléphone:", phone);
      
      const user = await User.findOne({ phone, role: "User" });
      if (!user) {
        console.log("❌ [RECHERCHE_CLIENT] Client introuvable pour:", phone);
        return res.status(404).json({ message: "Client introuvable" });
      }

      const profile = await UserProfile.findOne({ userId: user._id });
      if (!profile) {
        console.log("❌ [RECHERCHE_CLIENT] Profil introuvable pour user:", user._id);
        return res.status(404).json({ message: "Profil introuvable" });
      }

      console.log("✅ [RECHERCHE_CLIENT] Client trouvé:", {
        fullName: profile.fullName,
        email: profile.email,
        phone: user.phone
      });

      // Renvoyer toutes les informations du client
      res.json({ 
        fullName: profile.fullName,
        email: profile.email || "",
        phone: user.phone
      });
    } catch (err) {
      console.error("❌ Erreur recherche client :", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);


router.post("/register", registerClient);


// 🔓 Auth public
router.post("/register", register);
router.post("/login", login);

// 🔐 Mot de passe oublié (public)
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

// 🔐 Récupérer tous les utilisateurs (admin uniquement)
router.get(
  "/users",
  authMiddleware,
  sessionTracker,
  authorizeRoles("Admin"),
  getAllUsers
);

// 🔄 Activer ou désactiver la session tracking d'un utilisateur
router.put(
  "/users/:id/track-sessions",
  authMiddleware,
  sessionTracker,
  authorizeRoles("Admin"),
  updateTrackSessions
);

// 🔄 Modifier l'état actif/inactif d'un utilisateur
router.put(
  "/users/:id/status",
  authMiddleware,
  sessionTracker,
  authorizeRoles("Admin"),
  updateUserActiveStatus
);

module.exports = router;
