
// // controllers/userController.js
// const User = require("../models/User");

// exports.updateTrackSessions = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const { trackSessions } = req.body; // attend { trackSessions: true/false }
    
//     // Optionnel : vérifier que l'utilisateur authentifié a le droit de modifier cet utilisateur (ex: admin)
//     // if (req.user.role !== "admin") {
//     //   return res.status(403).json({ message: "Accès interdit" });
//     // }

//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { trackSessions: trackSessions },
//       { new: true }
//     );

//     if (!updatedUser) {
//       return res.status(404).json({ message: "Utilisateur non trouvé" });
//     }

//     res.status(200).json({ message: "Mise à jour réussie", user: updatedUser });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// exports.updateUserActiveStatus = async (req, res) => {
//     try {
//       const userId = req.params.id;
//       const { isActive } = req.body; // On attend { isActive: true/false }
      
//       // Met à jour l'utilisateur et renvoie le document mis à jour
//       const updatedUser = await User.findByIdAndUpdate(
//         userId,
//         { isActive },
//         { new: true }
//       );
      
//       if (!updatedUser) {
//         return res.status(404).json({ message: "Utilisateur non trouvé" });
//       }
      
//       res.status(200).json({ message: "Statut mis à jour", user: updatedUser });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   };


// exports.getAllUsers = async (req, res) => {
//   try {
//     // Récupère tous les utilisateurs depuis la collection "users"
//     const users = await User.find({});
//     res.status(200).json(users);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };







const User = require("../models/User");

// 🔁 Mise à jour de trackSessions
exports.updateTrackSessions = async (req, res) => {
  try {
    const userId = req.params.id;
    const { trackSessions } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { trackSessions },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json({ message: "Mise à jour réussie", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔄 Mise à jour du statut actif/inactif
exports.updateUserActiveStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { isActive } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json({ message: "Statut mis à jour", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📋 Liste de tous les utilisateurs
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
