// models/VentePatrimoine.js
const mongoose = require("mongoose");

const VentePatrimoineSchema = new mongoose.Schema(
  {
    patrimoineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatrimoineFoncier",
      required: true,
      index: true,
    },
    
    vendeurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    prixVente: {
      type: Number,
      required: true,
      min: 0,
    },
    
    commissionPourcentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    
    commissionMontant: {
      type: Number,
      required: true,
      min: 0,
    },
    
    statut: {
      type: String,
      enum: [
        "soumise", 
        "contre_propose", 
        "approuvee", 
        "en_vente", 
        "en_attente_notaire",  // Vente initiée, en attente d'assignation notaire
        "en_cours_notariat",   // Notaire travaille dessus
        "formalites_completes", // Notaire a complété les formalités
        "vendue",              // Vente finalisée
        "annulee", 
        "rejetee"
      ],
      default: "soumise",
      index: true,
    },
    
    // Acheteur (si vendu)
    acheteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    acheteurNom: String,
    acheteurPhone: String,
    acheteurEmail: String,
    
    // Bien créé pour l'acheteur
    bienAcheteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatrimoineFoncier",
    },
    
    // Négociation de prix
    contrePropositionPrix: Number, // Prix proposé par l'admin
    contrePropositionDate: Date,
    contrePropositionAcceptee: {
      type: Boolean,
      default: false,
    },
    
    dateVente: Date,
    
    // Validation Softlink
    valideePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin Softlink
    },
    
    dateValidation: Date,
    
    // Paiement de la commission
    commissionPayee: {
      type: Boolean,
      default: false,
    },
    
    paiementCommissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaiementPatrimoine",
    },
    
    notes: String,
    motifRejet: String,
    
    // Notaire assigné
    notaireId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notaire",
      index: true,
    },
    
    // Date d'assignation du notaire
    dateAssignationNotaire: Date,
    
    // Date de complétion des formalités par le notaire
    dateCompletionFormalites: Date,
    
    // Documents notariaux
    documentsNotariaux: [
      {
        nom: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["acte_vente", "acte_notarie", "quittance", "autre"],
        },
        url: String,
        uploadPar: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadLe: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
    // Historique de la vente
    historique: [
      {
        action: {
          type: String,
          required: true,
        },
        description: String,
        acteur: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        acteurType: {
          type: String,
          enum: ["Admin", "Commercial", "Notaire", "Agence"],
        },
        acteurNom: String,
        date: {
          type: Date,
          default: Date.now,
        },
        donnees: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Calculer montant commission avant save
VentePatrimoineSchema.pre('save', function (next) {
  if (this.prixVente && this.commissionPourcentage) {
    this.commissionMontant = (this.prixVente * this.commissionPourcentage) / 100;
  }
  next();
});

module.exports = mongoose.model("VentePatrimoine", VentePatrimoineSchema);

