// models/TarifPatrimoine.js
const mongoose = require("mongoose");

const TarifPatrimoineSchema = new mongoose.Schema(
  {
    typeBien: {
      type: String,
      enum: ["parcelle", "terrain", "maison", "villa", "appartement", "jardin", "autre"],
      required: true,
      unique: true,
    },
    
    montantEnregistrement: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      description: "Montant payé UNE SEULE FOIS lors de l'ajout du bien",
    },
    
    montantAbonnementAnnuel: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      description: "Montant payé CHAQUE ANNÉE pour maintenir la visibilité",
    },
    
    commissionVente: {
      type: Number, // Pourcentage
      required: true,
      min: 0,
      max: 100,
      default: 5, // 5% par défaut
      description: "Commission prélevée lors de la vente via Softlink",
    },
    
    actif: {
      type: Boolean,
      default: true,
    },
    
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TarifPatrimoine", TarifPatrimoineSchema);

