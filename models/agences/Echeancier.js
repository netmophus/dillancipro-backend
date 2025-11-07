const mongoose = require("mongoose");

const EcheanceSchema = new mongoose.Schema({
  dateEcheance: {
    type: Date,
    required: true,
  },
  montant: {
    type: Number,
    required: true,
    min: 0,
  },
  statut: {
    type: String,
    enum: ["a_venir", "payee", "en_retard", "annulee"],
    default: "a_venir",
  },
  datePaiementReelle: {
    type: Date,
  },
  recuUrl: {
    type: String,
  },
  recuPublicId: {
    type: String,
  },
  notes: {
    type: String,
  },
}, { _id: true });

const EcheancierSchema = new mongoose.Schema({
  paiement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paiement",
    required: true,
    unique: true, // Un paiement ne peut avoir qu'un seul échéancier
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  commercial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  parcelle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parcelle",
    required: true,
  },
  agenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agence",
    required: true,
  },
  montantTotal: {
    type: Number,
    required: true,
  },
  montantPaye: {
    type: Number,
    default: 0,
  },
  montantRestant: {
    type: Number,
    default: function () {
      return this.montantTotal;
    },
  },
  statut: {
    type: String,
    enum: ["en_cours", "termine", "annule"],
    default: "en_cours",
  },
  echeances: [EcheanceSchema],
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
        enum: ["Commercial", "Client", "Agence", "Admin"],
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
  notes: String,
}, { timestamps: true });

// Index pour les recherches fréquentes
EcheancierSchema.index({ paiement: 1 });
EcheancierSchema.index({ client: 1 });
EcheancierSchema.index({ commercial: 1 });
EcheancierSchema.index({ parcelle: 1 });
EcheancierSchema.index({ agenceId: 1 });
EcheancierSchema.index({ statut: 1 });

module.exports = mongoose.model("Echeancier", EcheancierSchema);

