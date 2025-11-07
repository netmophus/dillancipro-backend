const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../../controllers/agences/notificationController");

// Récupérer les notifications
router.get("/", authMiddleware, getNotifications);

// Marquer une notification comme lue
router.put("/:id/read", authMiddleware, markAsRead);

// Marquer toutes les notifications comme lues
router.put("/read-all", authMiddleware, markAllAsRead);

// Supprimer une notification
router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;