// routes/patrimoineRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const uploadParcelles = require("../middlewares/uploadParcelles"); // Réutilisation

const {
  createPatrimoine,
  getPatrimoine,
  getPatrimoineById,
  updatePatrimoine,
  deletePatrimoine,
  getPatrimoineStats,
} = require("../controllers/patrimoineController");

// Stats (avant :id)
router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("User", "Client"),
  getPatrimoineStats
);

// CRUD
router.post(
  "/",
  authMiddleware,
  authorizeRoles("User", "Client"),
  uploadParcelles, // Pour gérer photos et documents
  createPatrimoine
);

router.get(
  "/",
  authMiddleware,
  authorizeRoles("User", "Client"),
  getPatrimoine
);

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("User", "Client"),
  getPatrimoineById
);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("User", "Client"),
  uploadParcelles,
  updatePatrimoine
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("User", "Client"),
  deletePatrimoine
);

module.exports = router;

