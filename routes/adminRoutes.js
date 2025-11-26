// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const {
 createAdminUser,
 getAllUsers,
   createAgenceImmobiliere,
   getAllAgences,
   linkAdminToAgence,
   getUsersByRole,
   unlinkAdminFromAgence,
   updateAgence,
   // Fonctions de vérification
   verifyParcelle,
   unverifyParcelle,
   verifyBien,
   unverifyBien,
   getParcellesPending,
   getBiensPending,
   bulkVerifyParcelles,
   bulkVerifyBiens,
} = require("../controllers/adminController");
const User = require("../models/User");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const uploadAgenceDocs = require("../middlewares/uploadAgenceDocs");

// Routes géographiques (villes, quartiers, zones)
const geographicRoutes = require("./admin/geographicRoutes");

// Routes pour les banques
const {
  getAllBanques,
  getBanquesActives,
  getBanqueById,
  createBanque,
  updateBanque,
  deleteBanque,
} = require("../controllers/admin/banqueController");


// Routes protégées par le rôle Admin
router.post("/create-admin", authMiddleware, authorizeRoles("Admin"), createAdminUser);

router.post("/agence/:id/link-admin", linkAdminToAgence);

router.get("/users", getUsersByRole);


// 🔐 Protéger la route par Admin uniquement
router.get("/", authMiddleware, authorizeRoles("Admin"), getAllUsers);

router.post(
  "/create-agence",
  authMiddleware,
  authorizeRoles("Admin"),
  uploadAgenceDocs,
  createAgenceImmobiliere
);


router.get("/agences", getAllAgences);
router.put("/agences/:id", authMiddleware, authorizeRoles("Admin"), uploadAgenceDocs, updateAgence);
router.put("/agences/:id/unlink-admin", unlinkAdminFromAgence);


router.patch("/users/:id/status", authMiddleware, authorizeRoles("Admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut" });
  }
});

// 🏛️ Routes géographiques (villes, quartiers, zones)
router.use("/geographic", geographicRoutes);

// ========== ROUTES DE VÉRIFICATION DES PARCELLES ET BIENS ==========
// Routes pour les parcelles
router.put("/parcelles/:id/verify", authMiddleware, authorizeRoles("Admin"), verifyParcelle);
router.put("/parcelles/:id/unverify", authMiddleware, authorizeRoles("Admin"), unverifyParcelle);
router.get("/parcelles/pending", authMiddleware, authorizeRoles("Admin"), getParcellesPending);
router.put("/parcelles/bulk-verify", authMiddleware, authorizeRoles("Admin"), bulkVerifyParcelles);

// Routes pour les biens immobiliers
router.put("/biens/:id/verify", authMiddleware, authorizeRoles("Admin"), verifyBien);
router.put("/biens/:id/unverify", authMiddleware, authorizeRoles("Admin"), unverifyBien);
router.get("/biens/pending", authMiddleware, authorizeRoles("Admin"), getBiensPending);
router.put("/biens/bulk-verify", authMiddleware, authorizeRoles("Admin"), bulkVerifyBiens);

// ========== ROUTES POUR LES BANQUES PARTENAIRES ==========
// Route publique pour récupérer les banques actives (pour la homepage)
router.get("/banques/actives", getBanquesActives);

// Routes protégées pour l'administration des banques
router.get("/banques", authMiddleware, authorizeRoles("Admin"), getAllBanques);
router.get("/banques/:id", authMiddleware, authorizeRoles("Admin"), getBanqueById);
router.post("/banques", authMiddleware, authorizeRoles("Admin"), createBanque);
router.put("/banques/:id", authMiddleware, authorizeRoles("Admin"), updateBanque);
router.delete("/banques/:id", authMiddleware, authorizeRoles("Admin"), deleteBanque);

module.exports = router;
