// routes/admin/tarifRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

const {
  setTarif,
  getAllTarifs,
  getTarifByType,
  deleteTarif,
} = require("../../controllers/admin/tarifController");

// Middleware de logging pour toutes les routes
router.use((req, res, next) => {
  console.log("🚀 [TARIF_ROUTES] Requête:", req.method, req.path);
  next();
});

// Toutes les routes sont réservées aux admins
router.use(authMiddleware);
router.use((req, res, next) => {
  console.log("🔐 [TARIF_ROUTES] Après authMiddleware - User:", req.user);
  next();
});

// Routes administrateur uniquement
router.post("/", authorizeRoles("Admin"), setTarif);
router.get("/admin/all", authorizeRoles("Admin"), getAllTarifs);
router.delete("/:typeBien", authorizeRoles("Admin"), deleteTarif);

// Routes publiques pour récupérer les tarifs (lecture uniquement)
router.get("/", getAllTarifs);
router.get("/:typeBien", getTarifByType);

module.exports = router;

