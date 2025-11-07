// const UserSession = require("../models/UserSession");

// const checkInactivity = async (req, res, next) => {
//   try {
//     if (req.user && req.user.trackSessions) {
//       const session = await UserSession.findOne({ userId: req.user._id, status: "active" }).sort({ lastActivity: -1 });
//       if (session) {
//         const AUTO_LOGOUT_TIME_MS = parseInt(process.env.AUTO_LOGOUT_TIME) * 1000; // par exemple, 60*1000 = 60000ms
//         const now = Date.now();
//         const lastActivityTime = new Date(session.lastActivity).getTime();
//         const inactivityDuration = now - lastActivityTime;
//         if (inactivityDuration > AUTO_LOGOUT_TIME_MS) {
//           // Terminer la session
//           session.logoutTime = new Date();
//           session.status = "terminated";
//           await session.save();
//           return res.status(401).json({ message: "Session expirée en raison d'une inactivité prolongée" });
//         }
//       }
//     }
//   } catch (error) {
//     console.error("Erreur dans checkInactivity :", error);
//   }
//   next();
// };

// module.exports = checkInactivity;
