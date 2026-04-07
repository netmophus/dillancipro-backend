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
const VerificationCode = require("../models/VerificationCode");
const { sendSMS } = require("../services/smsService");
const { sendPasswordResetCode, sendVerificationCode } = require("../services/emailService");


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

    // Vérifier qu'au moins phone ou email est fourni
    const phoneProvided = phone && phone.trim() !== "";
    const emailProvided = email && email.trim() !== "";
    
    if (!phoneProvided && !emailProvided) {
      return res.status(400).json({ message: "Au moins un numéro de téléphone ou un email doit être fourni." });
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (phoneProvided) {
      const existing = await User.findOne({ phone: phone.trim() });
      if (existing) {
        return res.status(400).json({ message: "Ce numéro est déjà utilisé." });
      }
    }

    // Vérifier si l'email existe déjà (si fourni)
    if (emailProvided) {
      const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ message: "Cet email est déjà utilisé." });
      }
    }

    // Construire l'objet utilisateur dynamiquement pour éviter les valeurs null
    const userData = {
      password,
      role: "User",
      fullName: fullName.trim(),
    };
    
    // Ajouter phone seulement s'il est fourni
    if (phoneProvided) {
      userData.phone = phone.trim();
    }
    
    // Ajouter email seulement s'il est fourni
    if (emailProvided) {
      userData.email = email.trim().toLowerCase();
    }

    // Créer le compte utilisateur avec fullName
    const newUser = new User(userData);
    await newUser.save();

    // Créer le profil lié
    const newProfile = new UserProfile({
      userId: newUser._id,
      fullName: fullName.trim(),
      email: emailProvided ? email.trim().toLowerCase() : "",
    });
    await newProfile.save();

    // Générer un code OTP à 6 chiffres
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Définir l'expiration (15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Construire l'objet pour créer le code de vérification
    const verificationCodeData = {
      userId: newUser._id,
      code: verificationCode,
      expiresAt,
      verified: false,
      attempts: 0,
    };
    if (phoneProvided) {
      verificationCodeData.phone = phone.trim();
    }
    if (emailProvided) {
      verificationCodeData.email = email.trim().toLowerCase();
    }

    // Créer le code de vérification
    await VerificationCode.create(verificationCodeData);

    // Envoyer le code selon la méthode choisie
    if (phoneProvided) {
      // Envoyer par SMS
      const message = `Votre code de vérification MIZNAS Patrimoine est : ${verificationCode}. Ce code expire dans 15 minutes. Ne le partagez avec personne.`;
      const smsResult = await sendSMS(phone.trim(), message);

      if (!smsResult.success) {
        console.error("❌ [REGISTER_CLIENT] Échec envoi SMS OTP :", smsResult.error);
      } else {
        console.log(`✅ [REGISTER_CLIENT] Code OTP envoyé par SMS à ${phone.trim()}`);
      }
    } else {
      // Envoyer par email
      const emailResult = await sendVerificationCode(email.trim().toLowerCase(), verificationCode, fullName.trim());

      if (!emailResult || !emailResult.success) {
        console.error("❌ [REGISTER_CLIENT] Échec envoi email OTP :", emailResult?.error);
      } else {
        console.log(`✅ [REGISTER_CLIENT] Code OTP envoyé par email à ${email.trim().toLowerCase()}`);
      }
    }

    res.status(201).json({
      message: "Compte créé avec succès. Un code de vérification vous a été envoyé pour activer votre compte.",
      userId: newUser._id,
      requiresVerification: true,
      method: phoneProvided ? "SMS" : "email"
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

    // Vérifier qu'au moins phone ou email est fourni
    const phoneProvided = phone && phone.trim() !== "";
    const emailProvided = email && email.trim() !== "";
    
    if (!phoneProvided && !emailProvided) {
      return res.status(400).json({ message: "Au moins un numéro de téléphone ou un email doit être fourni." });
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (phoneProvided) {
      const existingUser = await User.findOne({ phone: phone.trim() });
      if (existingUser) {
        return res.status(400).json({ message: "Ce numéro de téléphone est déjà utilisé" });
      }
    }

    // Vérifier si l'email existe déjà (si fourni)
    if (emailProvided) {
      const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Construire l'objet utilisateur dynamiquement pour éviter les valeurs null
    const userData = {
      password: hashedPassword,
      role: role || "User",
      fullName: fullName.trim(),
      isActive: false, // Compte désactivé jusqu'à vérification OTP
    };
    
    // Ajouter phone seulement s'il est fourni
    if (phoneProvided) {
      userData.phone = phone.trim();
    }
    
    // Ajouter email seulement s'il est fourni
    if (emailProvided) {
      userData.email = email.trim().toLowerCase();
    }

    // Créer l'utilisateur avec fullName obligatoire
    const newUser = await User.create(userData);

    // Créer un profil si fullName ou email fournis
    if ((fullName && fullName.trim()) || emailProvided) {
      await UserProfile.create({
        userId: newUser._id,
        fullName: fullName.trim(),
        email: emailProvided ? email.trim().toLowerCase() : "",
      });
    }

    // Générer un code OTP à 6 chiffres
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Définir l'expiration (15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Construire l'objet pour créer le code de vérification
    const verificationCodeData = {
      userId: newUser._id,
      code: verificationCode,
      expiresAt,
      verified: false,
      attempts: 0,
    };
    if (phoneProvided) {
      verificationCodeData.phone = phone.trim();
    }
    if (emailProvided) {
      verificationCodeData.email = email.trim().toLowerCase();
    }

    // Créer le code de vérification
    await VerificationCode.create(verificationCodeData);

    // Envoyer le code selon la méthode choisie
    if (phoneProvided) {
      // Envoyer par SMS
      const message = `Votre code de vérification MIZNAS Patrimoine est : ${verificationCode}. Ce code expire dans 15 minutes. Ne le partagez avec personne.`;
      const smsResult = await sendSMS(phone.trim(), message);

      if (!smsResult.success) {
        console.error("❌ [REGISTER] Échec envoi SMS OTP :", smsResult.error);
        // On continue quand même, l'utilisateur pourra demander un nouveau code
      } else {
        console.log(`✅ [REGISTER] Code OTP envoyé par SMS à ${phone.trim()}`);
      }
    } else {
      // Envoyer par email
      const emailResult = await sendVerificationCode(email.trim().toLowerCase(), verificationCode, fullName.trim());

      if (!emailResult || !emailResult.success) {
        console.error("❌ [REGISTER] Échec envoi email OTP :", emailResult?.error);
        // On continue quand même, l'utilisateur pourra demander un nouveau code
      } else {
        console.log(`✅ [REGISTER] Code OTP envoyé par email à ${email.trim().toLowerCase()}`);
      }
    }

    res.status(201).json({ 
      message: "Compte créé avec succès. Un code de vérification vous a été envoyé pour activer votre compte.",
      userId: newUser._id,
      requiresVerification: true,
      method: phoneProvided ? "SMS" : "email"
    });
  } catch (error) {
    console.error("❌ Erreur register:", error);
    res.status(500).json({ message: error.message });
  }
};



exports.login = async (req, res) => {
  try {
    const { phone, email, password, identifier } = req.body;
    
    // Support pour identifier (phone ou email) pour compatibilité
    const loginPhone = phone || identifier;
    const loginEmail = email || identifier;

    // Vérifier qu'au moins phone ou email est fourni
    if (!loginPhone && !loginEmail) {
      return res.status(400).json({ message: "Numéro de téléphone ou email requis" });
    }

    // Chercher l'utilisateur par phone ou email
    let user;
    if (loginPhone && loginPhone.trim() !== "") {
      user = await User.findOne({ phone: loginPhone.trim() });
    } else if (loginEmail && loginEmail.trim() !== "") {
      user = await User.findOne({ email: loginEmail.trim().toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Votre compte n'est pas encore activé. Veuillez vérifier votre téléphone ou email pour le code d'activation.",
        requiresVerification: true,
        userId: user._id
      });
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
        phone: user.phone || "",
        email: profile?.email || user.email || "",
        fullName: fullName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== MOT DE PASSE OUBLIÉ ====================

// 📱📧 POST /api/auth/forgot-password - Demander la réinitialisation du mot de passe
exports.requestPasswordReset = async (req, res) => {
  try {
    const { phone, email } = req.body;

    console.log("🔍 [PASSWORD_RESET] Requête reçue:", { phone: phone ? "fourni" : "non fourni", email: email ? "fourni" : "non fourni" });

    // Vérifier qu'au moins phone ou email est fourni
    const phoneProvided = phone && typeof phone === "string" && phone.trim() !== "";
    const emailProvided = email && typeof email === "string" && email.trim() !== "";
    
    if (!phoneProvided && !emailProvided) {
      return res.status(400).json({ message: "Le numéro de téléphone ou l'email est requis" });
    }

    // Chercher l'utilisateur par phone ou email
    let user;
    if (phoneProvided) {
      user = await User.findOne({ phone: phone.trim() });
    } else if (emailProvided) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si le numéro/email existe ou non
      const method = phoneProvided ? "SMS" : "email";
      return res.status(200).json({ 
        message: `Si ce ${phoneProvided ? "numéro" : "email"} est enregistré, vous recevrez un code de vérification par ${method}` 
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

    // Construire l'objet de recherche pour supprimer les anciens codes
    const searchCriteria = { verified: false };
    if (phoneProvided) {
      searchCriteria.phone = phone.trim();
    } else {
      searchCriteria.email = email.trim().toLowerCase();
    }

    // Supprimer les anciens codes non vérifiés
    await PasswordResetCode.deleteMany(searchCriteria);

    // Construire l'objet pour créer le nouveau code
    const resetCodeData = {
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    };
    if (phoneProvided) {
      resetCodeData.phone = phone.trim();
    }
    if (emailProvided) {
      resetCodeData.email = email.trim().toLowerCase();
    }

    console.log("🔍 [PASSWORD_RESET] Données du code:", { 
      phone: resetCodeData.phone || "non fourni", 
      email: resetCodeData.email || "non fourni",
      code: resetCodeData.code 
    });

    // Créer le nouveau code de réinitialisation
    let resetCode;
    try {
      resetCode = await PasswordResetCode.create(resetCodeData);
      console.log("✅ [PASSWORD_RESET] Code créé avec succès:", resetCode._id);
    } catch (createError) {
      console.error("❌ [PASSWORD_RESET] Erreur lors de la création du code:", createError);
      throw new Error(`Erreur lors de la création du code de réinitialisation: ${createError.message}`);
    }

    // Récupérer le nom complet de l'utilisateur
    const profile = await UserProfile.findOne({ userId: user._id });
    const fullName = user.fullName || profile?.fullName || "Utilisateur";

    // Envoyer le code selon la méthode choisie
    if (phoneProvided) {
      // Envoyer par SMS
      const message = `Votre code de réinitialisation de mot de passe est : ${code}. Ce code expire dans 10 minutes. Ne le partagez avec personne.`;
      const smsResult = await sendSMS(phone.trim(), message);

      if (!smsResult.success) {
        await PasswordResetCode.findByIdAndDelete(resetCode._id);
        const errorMessage = smsResult.error || "Erreur lors de l'envoi du SMS. Veuillez réessayer plus tard.";
        console.error("❌ [PASSWORD_RESET] Échec envoi SMS :", errorMessage);
        return res.status(500).json({ message: errorMessage });
      }

      console.log(`✅ [PASSWORD_RESET] Code envoyé par SMS à ${phone.trim()}`);
      return res.status(200).json({ 
        message: "Si ce numéro est enregistré, vous recevrez un code de vérification par SMS",
        expiresIn: 600
      });
    } else {
      // Envoyer par email
      try {
        const emailResult = await sendPasswordResetCode(email.trim().toLowerCase(), code, fullName);

        if (!emailResult || !emailResult.success) {
          await PasswordResetCode.findByIdAndDelete(resetCode._id);
          const errorMessage = emailResult?.error || "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard ou utiliser la réinitialisation par téléphone.";
          console.error("❌ [PASSWORD_RESET] Échec envoi email :", errorMessage);
          return res.status(500).json({ message: errorMessage });
        }

        console.log(`✅ [PASSWORD_RESET] Code envoyé par email à ${email.trim().toLowerCase()}`);
        return res.status(200).json({ 
          message: "Si cet email est enregistré, vous recevrez un code de vérification par email",
          expiresIn: 600
        });
      } catch (emailError) {
        await PasswordResetCode.findByIdAndDelete(resetCode._id);
        console.error("❌ [PASSWORD_RESET] Exception lors de l'envoi email :", emailError);
        return res.status(500).json({ 
          message: "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard ou utiliser la réinitialisation par téléphone." 
        });
      }
    }

  } catch (error) {
    console.error("❌ [PASSWORD_RESET] Erreur:", error);
    console.error("❌ [PASSWORD_RESET] Stack:", error.stack);
    res.status(500).json({ 
      message: "Erreur serveur lors de la demande de réinitialisation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ✅ POST /api/auth/verify-reset-code - Vérifier le code de réinitialisation
exports.verifyResetCode = async (req, res) => {
  try {
    const { phone, email, code } = req.body;

    // Vérifier qu'au moins phone ou email est fourni
    const phoneProvided = phone && phone.trim() !== "";
    const emailProvided = email && email.trim() !== "";
    
    if ((!phoneProvided && !emailProvided) || !code) {
      return res.status(400).json({ message: "Le numéro de téléphone ou l'email et le code sont requis" });
    }

    // Construire la requête de recherche
    const searchCriteria = { verified: false };
    if (phoneProvided) {
      searchCriteria.phone = phone.trim();
    } else {
      searchCriteria.email = email.trim().toLowerCase();
    }

    // Trouver le code de réinitialisation
    const resetCode = await PasswordResetCode.findOne(searchCriteria);

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

    const identifier = phoneProvided ? phone.trim() : email.trim().toLowerCase();
    console.log(`✅ [PASSWORD_RESET] Code vérifié pour ${identifier}`);

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
    const { phone, email, code, newPassword } = req.body;

    // Vérifier qu'au moins phone ou email est fourni
    const phoneProvided = phone && phone.trim() !== "";
    const emailProvided = email && email.trim() !== "";
    
    if ((!phoneProvided && !emailProvided) || !code || !newPassword) {
      return res.status(400).json({ 
        message: "Le numéro de téléphone ou l'email, le code et le nouveau mot de passe sont requis" 
      });
    }

    // Vérifier la longueur du mot de passe (minimum 6 caractères)
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Le mot de passe doit contenir au moins 6 caractères" 
      });
    }

    // Construire la requête de recherche pour le code
    const searchCriteria = {
      code,
      verified: true,
    };
    if (phoneProvided) {
      searchCriteria.phone = phone.trim();
    } else {
      searchCriteria.email = email.trim().toLowerCase();
    }

    // Trouver le code de réinitialisation vérifié
    const resetCode = await PasswordResetCode.findOne(searchCriteria);

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
    let user;
    if (phoneProvided) {
      user = await User.findOne({ phone: phone.trim() });
    } else {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      await PasswordResetCode.findByIdAndDelete(resetCode._id);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Mettre à jour le mot de passe (le modèle User.hashPassword va automatiquement hacher le mot de passe)
    user.password = newPassword;
    await user.save();

    // Supprimer le code de réinitialisation utilisé
    await PasswordResetCode.findByIdAndDelete(resetCode._id);

    const identifier = phoneProvided ? phone.trim() : email.trim().toLowerCase();
    console.log(`✅ [PASSWORD_RESET] Mot de passe réinitialisé pour ${identifier}`);

    return res.status(200).json({ 
      message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." 
    });

  } catch (error) {
    console.error("❌ [RESET_PASSWORD] Erreur:", error);
    res.status(500).json({ message: "Erreur serveur lors de la réinitialisation du mot de passe" });
  }
};

// ==================== VÉRIFICATION DE COMPTE (OTP) ====================

// ✅ POST /api/auth/verify-account - Vérifier le code OTP et activer le compte
exports.verifyAccount = async (req, res) => {
  try {
    const { phone, email, code, userId } = req.body;

    // Vérifier qu'au moins phone ou email est fourni, ainsi que le code et userId
    const phoneProvided = phone && typeof phone === "string" && phone.trim() !== "";
    const emailProvided = email && typeof email === "string" && email.trim() !== "";
    
    if ((!phoneProvided && !emailProvided) || !code || !userId) {
      return res.status(400).json({ 
        message: "Le numéro de téléphone ou l'email, le code et l'ID utilisateur sont requis" 
      });
    }

    // Construire la requête de recherche
    const searchCriteria = {
      userId,
      verified: false,
    };
    if (phoneProvided) {
      searchCriteria.phone = phone.trim();
    } else {
      searchCriteria.email = email.trim().toLowerCase();
    }

    // Trouver le code de vérification
    const verificationCode = await VerificationCode.findOne(searchCriteria);

    // Vérifier si le code existe
    if (!verificationCode) {
      return res.status(400).json({ message: "Code de vérification invalide ou expiré" });
    }

    // Vérifier si le code n'a pas expiré
    if (new Date() > verificationCode.expiresAt) {
      // Ne pas supprimer le code pour garder une trace même s'il est expiré
      return res.status(400).json({ message: "Le code de vérification a expiré. Veuillez demander un nouveau code." });
    }

    // Vérifier le nombre de tentatives (max 5)
    if (verificationCode.attempts >= 5) {
      // Ne pas supprimer le code pour garder une trace même après trop de tentatives
      return res.status(400).json({ 
        message: "Trop de tentatives échouées. Veuillez demander un nouveau code." 
      });
    }

    // Vérifier si le code correspond
    if (verificationCode.code !== code) {
      // Incrémenter le nombre de tentatives
      verificationCode.attempts += 1;
      await verificationCode.save();

      const remainingAttempts = 5 - verificationCode.attempts;
      return res.status(400).json({ 
        message: `Code incorrect. ${remainingAttempts > 0 ? `Il vous reste ${remainingAttempts} tentative(s).` : "Trop de tentatives échouées."}` 
      });
    }

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      // Ne pas supprimer le code pour garder une trace même si l'utilisateur n'existe pas
      verificationCode.verified = false;
      verificationCode.attempts += 1;
      await verificationCode.save();
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier que le compte n'est pas déjà activé (sécurité supplémentaire)
    if (user.isActive) {
      // Marquer le code comme vérifié même si le compte est déjà actif (pour la trace)
      verificationCode.verified = true;
      verificationCode.verifiedAt = new Date();
      await verificationCode.save();
      
      return res.status(200).json({ 
        message: "Ce compte est déjà activé.",
        verified: true 
      });
    }

    // IMPORTANT : Activer le compte UNIQUEMENT après vérification réussie de l'OTP
    const activationDate = new Date();
    user.isActive = true;
    user.activatedAt = activationDate; // Garder une trace de la date d'activation
    await user.save();

    // Marquer le code comme vérifié et enregistrer la date de vérification (pour garder une trace)
    verificationCode.verified = true;
    verificationCode.verifiedAt = new Date();
    await verificationCode.save();

    const identifier = phoneProvided ? phone.trim() : email.trim().toLowerCase();
    console.log(`✅ [ACCOUNT_VERIFICATION] Compte activé pour ${identifier} - Code OTP vérifié le ${verificationCode.verifiedAt}`);

    return res.status(200).json({ 
      message: "Compte activé avec succès. Vous pouvez maintenant vous connecter.",
      verified: true,
      activatedAt: verificationCode.verifiedAt
    });

  } catch (error) {
    console.error("❌ [VERIFY_ACCOUNT] Erreur:", error);
    res.status(500).json({ message: "Erreur serveur lors de la vérification du compte" });
  }
};

// 📱📧 POST /api/auth/resend-verification-code - Renvoyer le code de vérification
exports.resendVerificationCode = async (req, res) => {
  try {
    const { phone, email, userId } = req.body;

    // Vérifier qu'au moins phone ou email est fourni, ainsi que userId
    const phoneProvided = phone && typeof phone === "string" && phone.trim() !== "";
    const emailProvided = email && typeof email === "string" && email.trim() !== "";
    
    if ((!phoneProvided && !emailProvided) || !userId) {
      return res.status(400).json({ 
        message: "Le numéro de téléphone ou l'email et l'ID utilisateur sont requis" 
      });
    }

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier que le compte n'est pas déjà activé
    if (user.isActive) {
      return res.status(400).json({ message: "Ce compte est déjà activé" });
    }

    // Supprimer les anciens codes non vérifiés pour cet utilisateur
    const searchCriteria = { userId, verified: false };
    if (phoneProvided) {
      searchCriteria.phone = phone.trim();
    } else {
      searchCriteria.email = email.trim().toLowerCase();
    }
    await VerificationCode.deleteMany(searchCriteria);

    // Générer un nouveau code OTP à 6 chiffres
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Définir l'expiration (15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Construire l'objet pour créer le code de vérification
    const verificationCodeData = {
      userId: user._id,
      code: verificationCode,
      expiresAt,
      verified: false,
      attempts: 0,
    };
    if (phoneProvided) {
      verificationCodeData.phone = phone.trim();
    }
    if (emailProvided) {
      verificationCodeData.email = email.trim().toLowerCase();
    }

    // Créer le code de vérification
    await VerificationCode.create(verificationCodeData);

    // Récupérer le nom complet
    const profile = await UserProfile.findOne({ userId: user._id });
    const fullName = user.fullName || profile?.fullName || "Utilisateur";

    // Envoyer le code selon la méthode choisie
    if (phoneProvided) {
      // Envoyer par SMS
      const message = `Votre code de vérification MIZNAS Patrimoine est : ${verificationCode}. Ce code expire dans 15 minutes. Ne le partagez avec personne.`;
      const smsResult = await sendSMS(phone.trim(), message);

      if (!smsResult.success) {
        console.error("❌ [RESEND_VERIFICATION] Échec envoi SMS OTP :", smsResult.error);
        return res.status(500).json({ 
          message: "Erreur lors de l'envoi du SMS. Veuillez réessayer plus tard." 
        });
      }

      console.log(`✅ [RESEND_VERIFICATION] Code OTP renvoyé par SMS à ${phone.trim()}`);
      return res.status(200).json({ 
        message: "Code de vérification renvoyé par SMS",
        expiresIn: 900 // 15 minutes en secondes
      });
    } else {
      // Envoyer par email
      const emailResult = await sendVerificationCode(email.trim().toLowerCase(), verificationCode, fullName);

      if (!emailResult || !emailResult.success) {
        console.error("❌ [RESEND_VERIFICATION] Échec envoi email OTP :", emailResult?.error);
        return res.status(500).json({ 
          message: "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard." 
        });
      }

      console.log(`✅ [RESEND_VERIFICATION] Code OTP renvoyé par email à ${email.trim().toLowerCase()}`);
      return res.status(200).json({ 
        message: "Code de vérification renvoyé par email",
        expiresIn: 900 // 15 minutes en secondes
      });
    }

  } catch (error) {
    console.error("❌ [RESEND_VERIFICATION] Erreur:", error);
    res.status(500).json({ message: "Erreur serveur lors du renvoi du code de vérification" });
  }
};
