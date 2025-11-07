// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// const authMiddleware = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       return res.status(401).json({ message: "Token non fourni" });
//     }
//     // Expecting header in the format "Bearer <token>"
//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     // Optionally, fetch the user from the database:
//     const user = await User.findById(decoded.id);
//     if (!user) {
//       return res.status(404).json({ message: "Utilisateur non trouvé" });
//     }
//     req.user = user; // Attach the user object to the request
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Token invalide ou expiré" });
//   }
// };

// module.exports = authMiddleware;




const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Agence = require("../models/Agence");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token non fourni ou mal formaté" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Attacher les données nécessaires
    req.user = {
      _id: user._id,  // ✅ Utiliser _id au lieu de id pour être cohérent avec les autres utilisations
      id: user._id,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
    };
    
    console.log("🔍 [AUTH_MIDDLEWARE] User authentifié:", {
      _id: req.user._id,
      phone: req.user.phone,
      role: req.user.role
    });

    // Si l'utilisateur est une Agence ou un Admin, récupérer son agenceId
    if (user.role === "Agence" || user.role === "Admin") {
      const agence = await Agence.findOne({ admin: user._id });
      if (agence) {
        req.user.agenceId = agence._id;
      }
    }
    
    // Si l'utilisateur est un Commercial, utiliser son agenceId
    if (user.role === "Commercial" && user.agenceId) {
      req.user.agenceId = user.agenceId;
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expirée, veuillez vous reconnecter" });
    }
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

module.exports = authMiddleware;
