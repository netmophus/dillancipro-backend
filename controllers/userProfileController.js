const UserProfile = require("../models/UserProfile");

// 📌 Créer un profil utilisateur (lié à l'utilisateur connecté)
exports.createUserProfile = async (req, res) => {
  try {
    const existingProfile = await UserProfile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(400).json({ message: "Profil déjà existant" });
    }

    const profileData = {
      userId: req.user._id,
      ...req.body, // fullName, email, region, ville, fonction, etc.
    };

    // Ajouter la photo si uploadée
    if (req.cloudinary?.photoUrl) {
      profileData.photoUrl = req.cloudinary.photoUrl;
      console.log("✅ [CREATE_PROFILE] Photo ajoutée:", profileData.photoUrl);
    }

    const profile = new UserProfile(profileData);
    await profile.save();
    
    res.status(201).json({ message: "Profil créé avec succès", profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔎 Obtenir le profil de l'utilisateur connecté
exports.getUserProfile = async (req, res) => {
  try {
    console.log("🔍 [GET_PROFILE] Recherche profil pour userId:", req.user._id || req.user.id);
    const profile = await UserProfile.findOne({ userId: req.user._id || req.user.id });
    
    if (!profile) {
      // Retourner un profil vide au lieu d'une erreur 404
      console.log("⚠️ [GET_PROFILE] Aucun profil trouvé, retour d'un profil par défaut");
      return res.status(200).json({
        userId: req.user._id || req.user.id,
        fullName: "",
        email: "",
        photoUrl: null
      });
    }
    
    console.log("✅ [GET_PROFILE] Profil trouvé:", profile.photoUrl ? "avec photo" : "sans photo");
    res.status(200).json(profile);
  } catch (error) {
    console.error("❌ [GET_PROFILE] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Mettre à jour le profil utilisateur (crée le profil s'il n'existe pas)
exports.updateUserProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // S'assurer que userId est toujours défini
    const userId = req.user._id || req.user.id;
    updateData.userId = userId;

    // Ajouter la photo si uploadée
    if (req.cloudinary?.photoUrl) {
      updateData.photoUrl = req.cloudinary.photoUrl;
      console.log("✅ [UPDATE_PROFILE] Photo mise à jour:", updateData.photoUrl);
    }

    // Utiliser upsert pour créer le profil s'il n'existe pas
    // Si le profil n'existe pas et que fullName n'est pas fourni, utiliser le nom de l'utilisateur
    if (!updateData.fullName && req.user?.fullName) {
      updateData.fullName = req.user.fullName;
    }

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId: userId },
      updateData,
      { 
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    console.log("✅ [UPDATE_PROFILE] Profil mis à jour ou créé avec succès");
    res.status(200).json({ message: "Profil mis à jour", profile: updatedProfile });
  } catch (error) {
    console.error("❌ [UPDATE_PROFILE] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};
