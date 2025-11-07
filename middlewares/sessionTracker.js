const UserSession = require("../models/UserSession");

const sessionTracker = async (req, res, next) => {
  try {
    if (req.user && req.user.trackSessions) {
      // Chercher la session active la plus récente pour cet utilisateur
      const userId = req.user._id || req.user.id;
      const session = await UserSession.findOne({ userId: userId, status: "active" }).sort({ lastActivity: -1 });
      
      // Convertir le temps d'inactivité autorisé en millisecondes (ici 60s => 60000ms)
      const AUTO_LOGOUT_TIME_MS = parseInt(process.env.AUTO_LOGOUT_TIME) * 1000;

      if (session) {
        const now = Date.now();
        const lastActivityTime = new Date(session.lastActivity).getTime();
        const inactivityDuration = now - lastActivityTime;
        
        if (inactivityDuration > AUTO_LOGOUT_TIME_MS) {
          // Inactivité dépassée : terminer la session et renvoyer une réponse d'erreur
          console.log("Session expirée par inactivité. Durée d'inactivité :", inactivityDuration, "ms");
          session.logoutTime = new Date();
          session.status = "terminated";
          await session.save();
          return res.status(401).json({ message: "Session expirée en raison d'une inactivité prolongée" });
        } else {
          // Mise à jour de la dernière activité
          console.log("Session trouvée avant mise à jour :", session);
          session.lastActivity = new Date();
          await session.save();
          console.log("Session mise à jour, nouvelle lastActivity :", session.lastActivity);
        }
      } else {
        const userId = req.user._id || req.user.id;
        console.log("Aucune session active trouvée pour l'utilisateur :", userId);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la session :", error);
  }
  next();
};

module.exports = sessionTracker;
