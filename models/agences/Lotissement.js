// models/agences/Lotissement.js
// Niveau intermédiaire : Zone > Lotissement > Îlot > Parcelle
const mongoose = require("mongoose");

const LotissementSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true, index: true },
    // Dénormalisé depuis la zone (pour les filtres et l'affichage)
    quartier: { type: mongoose.Schema.Types.ObjectId, ref: "Quartier", index: true },
    agenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Agence", required: true, index: true },
    surfaceTotale: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "", trim: true },
    localisation: { lat: Number, lng: Number },
    images: [{ type: String }],
    videos: [{ type: String }],
  },
  { timestamps: true }
);

// Un même nom ne peut exister qu'une fois par zone et par agence
LotissementSchema.index({ zone: 1, nom: 1, agenceId: 1 }, { unique: true });

module.exports = mongoose.model("Lotissement", LotissementSchema);
