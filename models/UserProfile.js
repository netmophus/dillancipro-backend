// models/UserProfile.js
const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // Un seul profil par utilisateur
  },
  fullName: {
    type: String,
    required: true,
  },
  email: String,
  address: String,
  region: String,
  ville: String,
  fonction: String, // Ex : Directeur d’agence, Chef de département...
  photoUrl: String,

  // Champs optionnels spécifiques
  agenceName: String,      // pour les agences immobilières
  ministereDepartement: String, // pour le ministère
  banqueNomService: String,     // pour les banques


  // ✅ Ajout : liste des parcelles affectées
  assignedParcelles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parcelle",
  }],
  


}, { timestamps: true });

module.exports = mongoose.model("UserProfile", UserProfileSchema);
