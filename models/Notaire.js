// models/Notaire.js
const mongoose = require("mongoose");

const NotaireSchema = new mongoose.Schema(
  {
    // Informations personnelles
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Adresse email invalide",
      },
    },
    
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    
    // Cabinet/Étude notariale
    cabinetName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Adresse du cabinet
    adresse: {
      type: String,
      trim: true,
    },
    
    ville: {
      type: String,
      trim: true,
      default: "Niamey",
    },
    
    quartier: {
      type: String,
      trim: true,
    },
    
    // Statut
    statut: {
      type: String,
      enum: ["actif", "inactif"],
      default: "actif",
      index: true,
    },
    
    // Date de partenariat
    datePartenariat: {
      type: Date,
      default: Date.now,
    },
    
    // Documents (accréditations, etc.)
    documents: [
      {
        type: {
          type: String,
          enum: ["accréditation", "agrément", "autre"],
        },
        url: String,
        nom: String,
      },
    ],
    
    // Compte utilisateur associé (créé automatiquement)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },
    
    // Notes
    notes: {
      type: String,
      trim: true,
    },
    
    // Créé par
    creePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin qui a créé le notaire
    },
  },
  {
    timestamps: true,
  }
);

// Index pour recherche
NotaireSchema.index({ email: 1 });
NotaireSchema.index({ phone: 1 });
NotaireSchema.index({ statut: 1 });

module.exports = mongoose.model("Notaire", NotaireSchema);

