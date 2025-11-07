const mongoose = require("mongoose");

const VenteSchema = new mongoose.Schema({
  parcelle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parcelle",
    required: true,
    unique: true, // une parcelle ne peut être vendue qu'une seule fois
  },
  acquereurNom: {
    type: String,
    required: true,
  },
  acquereurTelephone: {
    type: String,
    required: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  commercialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  typePaiement: {
    type: String,
    enum: ["total", "partiel"],
    required: true,
  },
  montantTotal: {
    type: Number,
    default: 0,
  },
  montantPaye: {
    type: Number,
    default: 0,
  },
  recuUrl: {
    type: String, // chemin du reçu (PDF ou image)
  },
  dateVente: {
    type: Date,
    default: Date.now,
  },
  agenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agence",
    required: true,
    index: true,
  },
  // Notaire assigné pour les formalités
  notaireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Notaire",
    index: true,
  },
  // Statut de la vente avec notaire
  statut: {
    type: String,
    enum: [
      "en_attente_paiement",      // Vente créée, en attente de paiement complet
      "paiement_complet",          // Paiement complété, en attente d'assignation notaire
      "en_attente_notaire",        // Paiement complété, notaire choisi, en attente de traitement
      "en_cours_notariat",         // Notaire travaille dessus
      "formalites_completes",       // Notaire a complété les formalités (documents prêts)
      "en_attente_signature",      // Documents prêts, en attente de signature
      "signee",                     // Vente signée par toutes les parties
      "finalisee",                  // Vente finalisée
      "annulee",                    // Vente annulée
    ],
    default: "en_attente_paiement",
    index: true,
  },
  // Date d'assignation du notaire (quand le paiement est complété)
  dateAssignationNotaire: {
    type: Date,
  },
  // Date de complétion des formalités par le notaire
  dateCompletionFormalites: {
    type: Date,
  },
  // Date de signature
  dateSignature: {
    type: Date,
  },
  // Date de finalisation
  dateFinalisation: {
    type: Date,
  },
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
        enum: ["Admin", "Commercial", "Notaire", "Agence", "Client"],
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
  // Signatures
  signatures: {
    commercial: {
      type: Boolean,
      default: false,
    },
    client: {
      type: Boolean,
      default: false,
    },
    agence: {
      type: Boolean,
      default: false,
    },
  },
  // Notes
  notes: String,
}, { timestamps: true });

// Index pour les recherches
VenteSchema.index({ agenceId: 1 });
VenteSchema.index({ notaireId: 1 });
VenteSchema.index({ statut: 1 });
VenteSchema.index({ parcelle: 1 });

module.exports = mongoose.model("Vente", VenteSchema);
