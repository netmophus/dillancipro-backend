// const mongoose = require("mongoose");

// const ParcelleSchema = new mongoose.Schema({
//   numeroParcelle: { type: String, required: true },
//   ilot: { type: mongoose.Schema.Types.ObjectId, ref: "Ilot", required: true },
//   superficie: Number,
//   prix: Number,
//   statut: { type: String, enum: ["avendre", "vendue", "reserved"], default: "avendre" },
//   affecteeA: { type: mongoose.Schema.Types.ObjectId, ref: "User" },     // Commercial
//   vendueA: { type: mongoose.Schema.Types.ObjectId, ref: "User" },       // Acheteur
//   dateVente: Date,
//   localisation: {
//     lat: Number,
//     lng: Number,
//   },
//   description: String,
//   images: [String],
//   videos: [String],
//   documents: [String],
// }, { timestamps: true });

// module.exports = mongoose.model("Parcelle", ParcelleSchema);



// models/agences/Parcelle.js
const mongoose = require("mongoose");

const ParcelleSchema = new mongoose.Schema(
  {
    numeroParcelle: { type: String, required: true },
    ilot: { type: mongoose.Schema.Types.ObjectId, ref: "Ilot", required: true, index: true },
    agenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Agence", required: true, index: true }, // 🔗
    superficie: Number,
    prix: Number,
    statut: { type: String, enum: ["avendre", "vendue", "reserved"], default: "avendre" },
    affecteeA: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    vendueA: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dateVente: Date,
    localisation: { lat: Number, lng: Number },
   
    description: String,
    // Les images et vidéos sont maintenant stockées au niveau de l'îlot (partagées)
    // Seuls les documents sont spécifiques à chaque parcelle
    documents: [String],
    
    // Système de vérification par l'admin général
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin général qui a vérifié
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Une parcelle ne peut pas avoir le même numéro deux fois dans le même îlot
ParcelleSchema.index({ ilot: 1, numeroParcelle: 1 }, { unique: true });

module.exports = mongoose.model("Parcelle", ParcelleSchema);
