// models/agences/VenteBienImmobilier.js
const mongoose = require("mongoose");

const VenteBienImmobilierSchema = new mongoose.Schema(
  {
    // Bien immobilier vendu
    bienId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BienImmobilier",
      required: true,
      index: true,
    },
    
    // Commercial qui a effectué la vente
    commercialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Agence concernée
    agenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agence",
      required: true,
      index: true,
    },
    
    // Client acheteur
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Prix de vente
    prixVente: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Statut de la vente
    statut: {
      type: String,
      enum: [
        "en_attente_notaire",  // Vente initiée, en attente d'assignation notaire
        "en_cours_notariat",   // Notaire travaille dessus
        "formalites_completes", // Notaire a complété les formalités (documents prêts)
        "en_attente_signature", // Documents prêts, en attente de signature
        "signee",              // Vente signée par toutes les parties
        "finalisee",           // Vente finalisée (argent transféré)
        "annulee",             // Vente annulée
      ],
      default: "en_attente_notaire",
      index: true,
    },
    
    // Notaire assigné
    notaireId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notaire",
      required: true,
      index: true,
    },
    
    // Date de la vente
    dateVente: {
      type: Date,
      default: Date.now,
    },
    
    // Date d'assignation du notaire
    dateAssignationNotaire: {
      type: Date,
      default: Date.now,
    },
    
    // Date de complétion des formalités par le notaire
    dateCompletionFormalites: Date,
    
    // Date de signature de la vente
    dateSignature: Date,
    
    // Date de finalisation (transfert d'argent)
    dateFinalisation: Date,
    
    // Indique si l'argent a été transféré à l'agence
    argentTransfere: {
      type: Boolean,
      default: false,
    },
    
    // Suivi des signatures (qui a signé)
    signatures: {
      commercial: { type: Boolean, default: false },
      client: { type: Boolean, default: false },
      agence: { type: Boolean, default: false },
      dateSignatureCommercial: Date,
      dateSignatureClient: Date,
      dateSignatureAgence: Date,
    },
    
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
    
    // Notes
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Index pour recherche
VenteBienImmobilierSchema.index({ bienId: 1 });
VenteBienImmobilierSchema.index({ commercialId: 1 });
VenteBienImmobilierSchema.index({ agenceId: 1 });
VenteBienImmobilierSchema.index({ clientId: 1 });
VenteBienImmobilierSchema.index({ notaireId: 1 });
VenteBienImmobilierSchema.index({ statut: 1 });

module.exports = mongoose.model("VenteBienImmobilier", VenteBienImmobilierSchema);

