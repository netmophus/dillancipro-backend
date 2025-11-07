// routes/admin/notaireRoutes.js
const express = require("express");
const router = express.Router();
const notaireController = require("../../controllers/admin/notaireController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

// Toutes les routes nécessitent l'authentification et le rôle Admin
router.use(authMiddleware);
router.use(authorizeRoles("Admin"));

// Routes CRUD pour les notaires
router.post("/", notaireController.createNotaire);
router.get("/", notaireController.getAllNotaires);
router.get("/:id", notaireController.getNotaireById);
router.put("/:id", notaireController.updateNotaire);
router.delete("/:id", notaireController.deleteNotaire);

module.exports = router;

