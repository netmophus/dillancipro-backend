const Notification = require("../../models/agences/Notification");

/**
 * Récupérer les notifications d'un utilisateur
 * GET /api/agence/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    console.log("📝 [GET_NOTIFICATIONS] User:", { id: req.user.id, role: req.user.role });

    const notifications = await Notification.find({ toUser: req.user.id })
      .populate('agenceId', 'nom')
      .sort({ createdAt: -1 })
      .limit(50); // Limiter à 50 notifications récentes

    console.log("✅ [GET_NOTIFICATIONS] Notifications trouvées:", notifications.length);

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("❌ [GET_NOTIFICATIONS] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Marquer une notification comme lue
 * PUT /api/agence/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification non trouvée" });
    }

    return res.status(200).json({ message: "Notification marquée comme lue" });
  } catch (error) {
    console.error("❌ [MARK_AS_READ] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Marquer toutes les notifications comme lues
 * PUT /api/agence/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { toUser: req.user.id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({ message: "Toutes les notifications marquées comme lues" });
  } catch (error) {
    console.error("❌ [MARK_ALL_AS_READ] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Supprimer une notification
 * DELETE /api/agence/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification non trouvée" });
    }

    return res.status(200).json({ message: "Notification supprimée" });
  } catch (error) {
    console.error("❌ [DELETE_NOTIFICATION] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};