// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const UserSession = require("../models/UserSession");


// // Inscription
// exports.register = async (req, res) => {
//   try {
//     const { fullName, phone, email, password, role } = req.body;

//     // Vérifier si l'utilisateur existe déjà
//     const existingUser = await User.findOne({ phone });
//     if (existingUser) return res.status(400).json({ message: "Numéro déjà utilisé" });

//     // Hachage du mot de passe
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Créer un nouvel utilisateur
//     const newUser = new User({
//       fullName,
//       phone,
//       email,
//       password: hashedPassword,
//       role
//     });

//     await newUser.save();
//     res.status(201).json({ message: "Utilisateur créé avec succès" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Connexion
// // Dans controllers/authcontroller.js
// // exports.login = async (req, res) => {
// //     try {
// //       const { phone, password } = req.body;
  
// //       const user = await User.findOne({ phone });
// //       if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
  
// //       const isMatch = await bcrypt.compare(password, user.password);
// //       if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });
  
// //       const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  
// //       res.status(200).json({
// //         token,
// //         user: { id: user._id, fullName: user.fullName, role: user.role }
// //       });
// //     } catch (error) {
// //       res.status(500).json({ message: error.message });
// //     }
// //   };
  


// exports.login = async (req, res) => {
//   try {
//     const { phone, password } = req.body;

//     // Vérifier si l'utilisateur existe
//     const user = await User.findOne({ phone });
//     if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

//   // Vérifier si l'utilisateur est actif
//   if (!user.isActive) {
//     return res.status(403).json({ message: "Votre compte est inactif. Veuillez contacter l'administrateur." });
//   }





//     // Vérifier le mot de passe
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

//     // Générer le token JWT
//     const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

//     // Si le suivi des sessions est activé, créer un enregistrement de session
//     if (user.trackSessions) {
//         console.log("trackSessions activé pour l'utilisateur :", user._id);
//         const session = new UserSession({
//           userId: user._id,
//           ipAddress: req.ip, // Vérifiez que req.ip retourne bien la bonne valeur dans votre configuration
//           device: req.headers["user-agent"] || "inconnu",
//           loginTime: Date.now(),
//           lastActivity: Date.now(),
//           status: "active",
//         });
//         console.log("Création de la session, avant sauvegarde :", session);
//         await session.save();
//         console.log("Session enregistrée avec succès :", session);
//       }

//     // Renvoyer le token et quelques informations sur l'utilisateur
//     res.status(200).json({
//       token,
//       user: { id: user._id, fullName: user.fullName, role: user.role },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// exports.getProfile = async (req, res) => {
//     try {
//       // req.user should be set by the authMiddleware after verifying the token
//       const user = req.user;
//       if (!user) {
//         return res.status(404).json({ message: "Utilisateur non trouvé" });
//       }
//       // Return the user's full name and role
//       res.status(200).json({ fullName: user.fullName, role: user.role });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   };



//   exports.logout = async (req, res) => {
//     try {
//       // On suppose que req.user est défini par votre middleware d'authentification
//       if (req.user && req.user.trackSessions) {
//         // Rechercher la session active pour cet utilisateur
//         const session = await UserSession.findOne({ userId: req.user._id, status: "active" }).sort({ lastActivity: -1 });
//         if (session) {
//           session.logoutTime = new Date();
//           session.status = "terminated";
//           await session.save();
//         }
//       }
//       // Vous pouvez ici invalider le token côté client (par exemple, en le supprimant du localStorage)
//       res.status(200).json({ message: "Déconnexion réussie" });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   };



//   exports.getSessions = async (req, res) => {
//     try {
//       // Vérifier que l'utilisateur est admin si nécessaire (ou ajouter un middleware pour cela)
//       const sessions = await UserSession.find().populate("userId", "fullName role").sort({ loginTime: -1 });
//       res.status(200).json(sessions);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   };
  









const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserProfile = require("../models/UserProfile");
const PasswordResetCode = require("../models/PasswordResetCode");
const { sendSMS } = require("../services/smsService");


// 🔐 Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "1d", // ou 7d selon ton besoin
  });
};




exports.registerClient = async (req, res) => {
  try {
    const { fullName, phone, email, password } = req.body;

    // Vérifier que le fullName est fourni
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: "Le nom complet est requis." });
    }

    // Vérifier si le numéro est déjà utilisé
    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Ce numéro est déjà utilisé." });
    }

    // Créer le compte utilisateur avec fullName
    const newUser = new User({
      phone,
      password,
      role: "User", // ou "Client" si tu préfères
      fullName: fullName.trim(), // ✅ S'assurer que fullName est dans User
    });
    await newUser.save();

    // Créer le profil lié
    const newProfile = new UserProfile({
      userId: newUser._id,
      fullName: fullName.trim(),
      email,
    });
    await newProfile.save();

    res.status(201).json({
      message: "Client inscrit avec succès.",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("❌ Erreur inscription client :", error);
    res.status(500).json({ message: "Erreur serveur lors de l'inscription" });
  }
};

// ✅ Enregistrement d'un nouvel utilisateur
exports.register = async (req, res) => {
  try {
    const { phone, password, role, fullName, email } = req.body;

    // Vérifier que le fullName est fourni
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: "Le nom complet est requis." });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Utilisateur déjà existant" });
    }

    // Vérifier si l'email existe (si fourni)
    if (email && email.trim() !== "") {
      const existingEmail = await User.findOne({ email: email.trim() });
      if (existingEmail) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur avec fullName obligatoire
    const newUser = await User.create({
      phone,
      password: hashedPassword,
      role,
      fullName: fullName.trim(), // ✅ S'assurer que fullName est toujours renseigné
      email: email && email.trim() !== "" ? email.trim() : undefined,
    });

    // Créer un profil si fullName ou email fournis
    if ((fullName && fullName.trim()) || (email && email.trim())) {
      await UserProfile.create({
        userId: newUser._id,
        fullName: fullName.trim(),
        email: email || "",
      });
    }

    res.status(201).json({ message: "Utilisateur créé avec succès", user: newUser });
  } catch (error) {
    console.error("❌ Erreur register:", error);
    res.status(500).json({ message: error.message });
  }
};



exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    // 🔍 Récupérer le profil associé à cet utilisateur
    const profile = await UserProfile.findOne({ userId: user._id });

    // Déterminer le nom complet (prioriser User.fullName, puis profile.fullName, sinon "Sans nom")
    let fullName = "Sans nom";
    if (user.fullName && user.fullName.trim()) {
      fullName = user.fullName.trim();
    } else if (profile?.fullName && profile.fullName.trim()) {
      fullName = profile.fullName.trim();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        _id: user._id,
        role: user.role,
        phone: user.phone,
        email: profile?.email || user.email || "",
        fullName: fullName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== MOT DE PASSE OUBLIÉ ====================

// 📱 POST /api/auth/forgot-password - Demander la réinitialisation du mot de passe
exports.requestPasswordReset = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Le numéro de téléphone est requis" });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ phone });
    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si le numéro existe ou non
      return res.status(200).json({ 
        message: "Si ce numéro est enregistré, vous recevrez un code de vérification par SMS" 
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Votre compte est inactif. Veuillez contacter l'administrateur." 
      });
    }

    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Définir l'expiration (10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Supprimer les anciens codes non vérifiés pour ce numéro
    await PasswordResetCode.deleteMany({ 
      phone, 
      verified: false 
    });

    // Créer le nouveau code de réinitialisation
    const resetCode = await PasswordResetCode.create({
      phone,
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    // Préparer le message SMS
    const message = `Votre code de réinitialisation de mot de passe est : ${code}. Ce code expire dans 10 minutes. Ne le partagez avec personne.`;

    // Envoyer le SMS
    const smsResult = await sendSMS(phone, message);

    if (!smsResult.success) {
      // Supprimer le code si l'envoi SMS a échoué
      await PasswordResetCode.findByIdAndDelete(resetCode._id);
      const errorMessage = smsResult.error || "Erreur lors de l'envoi du SMS. Veuillez réessayer plus tard.";
      console.error("❌ [PASSWORD_RESET] Échec envoi SMS :", errorMessage);
      return res.status(500).json({ 
        message: errorMessage 
      });
    }

    console.log(`✅ [PASSWORD_RESET] Code envoyé à ${phone}`);

    // Pour des raisons de sécurité, on ne révèle pas si le numéro existe
    return res.status(200).json({ 
      message: "Si ce numéro est enregistré, vous recevrez un code de vérification par SMS",
      expiresIn: 600 // 10 minutes en secondes
    });

  } catch (error) {
    console.error("❌ [PASSWORD_RESET] Erreur:", error);
    res.status(500).json({ message: "Erreur serveur lors de la demande de réinitialisation" });
  }
};

// ✅ POST /api/auth/verify-reset-code - Vérifier le code de réinitialisation
exports.verifyResetCode = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ message: "Le numéro de téléphone et le code sont requis" });
    }

    // Trouver le code de réinitialisation pour ce numéro
    const resetCode = await PasswordResetCode.findOne({
      phone,
      verified: false,
    });

    // Vérifier si le code existe
    if (!resetCode) {
      return res.status(400).json({ message: "Code de vérification invalide ou expiré" });
    }

    // Vérifier si le code n'a pas expiré
    if (new Date() > resetCode.expiresAt) {
      await PasswordResetCode.findByIdAndDelete(resetCode._id);
      return res.status(400).json({ message: "Le code de vérification a expiré" });
    }

    // Vérifier le nombre de tentatives (max 5)
    if (resetCode.attempts >= 5) {
      await PasswordResetCode.findByIdAndDelete(resetCode._id);
      return res.status(400).json({ 
        message: "Trop de tentatives échouées. Veuillez demander un nouveau code." 
      });
    }

    // Vérifier si le code correspond
    if (resetCode.code !== code) {
      // Incrémenter le nombre de tentatives
      resetCode.attempts += 1;
      await resetCode.save();

      const remainingAttempts = 5 - resetCode.attempts;
      return res.status(400).json({ 
        message: `Code incorrect. ${remainingAttempts > 0 ? `Il vous reste ${remainingAttempts} tentative(s).` : "Trop de tentatives échouées."}` 
      });
    }

    // Marquer le code comme vérifié
    resetCode.verified = true;
    await resetCode.save();

    console.log(`✅ [PASSWORD_RESET] Code vérifié pour ${phone}`);

    return res.status(200).json({ 
      message: "Code de vérification valide",
      verified: true 
    });

  } catch (error) {
    console.error("❌ [VERIFY_RESET_CODE] Erreur:", error);
    res.status(500).json({ message: "Erreur serveur lors de la vérification du code" });
  }
};

// 🔐 POST /api/auth/reset-password - Réinitialiser le mot de passe
exports.resetPassword = async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;

    if (!phone || !code || !newPassword) {
      return res.status(400).json({ 
        message: "Le numéro de téléphone, le code et le nouveau mot de passe sont requis" 
      });
    }

    // Vérifier la longueur du mot de passe (minimum 6 caractères)
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Le mot de passe doit contenir au moins 6 caractères" 
      });
    }

    // Trouver le code de réinitialisation vérifié
    const resetCode = await PasswordResetCode.findOne({
      phone,
      code,
      verified: true,
    });

    // Vérifier si le code existe et est vérifié
    if (!resetCode) {
      return res.status(400).json({ 
        message: "Code de vérification invalide ou non vérifié. Veuillez demander un nouveau code." 
      });
    }

    // Vérifier si le code n'a pas expiré
    if (new Date() > resetCode.expiresAt) {
      await PasswordResetCode.findByIdAndDelete(resetCode._id);
      return res.status(400).json({ message: "Le code de vérification a expiré" });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ phone });
    if (!user) {
      await PasswordResetCode.findByIdAndDelete(resetCode._id);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Mettre à jour le mot de passe (le modèle User.hashPassword va automatiquement hacher le mot de passe)
    user.password = newPassword;
    await user.save();

    // Supprimer le code de réinitialisation utilisé
    await PasswordResetCode.findByIdAndDelete(resetCode._id);

    console.log(`✅ [PASSWORD_RESET] Mot de passe réinitialisé pour ${phone}`);

    return res.status(200).json({ 
      message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." 
    });

  } catch (error) {
    console.error("❌ [RESET_PASSWORD] Erreur:", error);
    res.status(500).json({ message: "Erreur serveur lors de la réinitialisation du mot de passe" });
  }
};
