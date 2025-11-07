// routes/clientRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { getClientDashboard, getMesAchatsAgence } = require("../controllers/clientDashboardController");

// Dashboard du client
router.get(
  "/dashboard",
  authMiddleware,
  authorizeRoles("User", "Client"),
  getClientDashboard
);

// Mes achats via agence
router.get(
  "/mes-achats-agence",
  authMiddleware,
  authorizeRoles("User", "Client"),
  getMesAchatsAgence
);

module.exports = router;

