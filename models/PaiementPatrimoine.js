// models/PaiementPatrimoine.js
const mongoose = require("mongoose");

const PaiementPatrimoineSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    patrimoineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatrimoineFoncier",
      required: true,
      index: true,
    },
    
    typePaiement: {
      type: String,
      enum: ["enregistrement", "abonnement_annuel", "commission_vente"],
      required: true,
    },
    
    anneeAbonnement: {
      type: Number, // Année de l'abonnement (ex: 2025)
    },
    
    montant: {
      type: Number,
      required: true,
      min: 0,
    },
    
    statut: {
      type: String,
      enum: ["en_attente", "paye", "echoue", "annule"],
      default: "en_attente",
      index: true,
    },
    
    methodePaiement: {
      type: String,
      enum: ["orange_money", "moov_money", "airtel_money", "zamani", "virement", "especes", "autre"],
    },
    
    transactionId: {
      type: String, // ID de la transaction du provider
      unique: true,
      sparse: true,
    },
    
    reference: {
      type: String,
      unique: true,
    },
    
    datePaiement: Date,
    
    // Pour les commissions de vente
    venteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VentePatrimoine",
    },
    
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Générer référence unique
PaiementPatrimoineSchema.pre('save', async function (next) {
  if (this.isNew && !this.reference) {
    const count = await mongoose.model('PaiementPatrimoine').countDocuments();
    this.reference = `PAY-${Date.now()}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model("PaiementPatrimoine", PaiementPatrimoineSchema);

