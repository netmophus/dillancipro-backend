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
} = require("../controllers/adminController");
const User = require("../models/User");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const uploadAgenceDocs = require("../middlewares/uploadAgenceDocs");

// Routes géographiques (villes, quartiers, zones)
const geographicRoutes = require("./admin/geographicRoutes");


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

module.exports = router;
