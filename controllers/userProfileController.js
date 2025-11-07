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

// ✏️ Mettre à jour le profil utilisateur
exports.updateUserProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Ajouter la photo si uploadée
    if (req.cloudinary?.photoUrl) {
      updateData.photoUrl = req.cloudinary.photoUrl;
      console.log("✅ [UPDATE_PROFILE] Photo mise à jour:", updateData.photoUrl);
    }

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId: req.user._id },
      updateData,
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Profil non trouvé" });
    }

    res.status(200).json({ message: "Profil mis à jour", profile: updatedProfile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
