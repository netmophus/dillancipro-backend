// models/agences/ProfilCommercial.js
const mongoose = require("mongoose");

const ProfilCommercialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    agenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agence",
      index: true,
    },

    // Identité
    fullName: { type: String, trim: true, default: "" },

    // Adresse structurée (facultatif)
    adresse: {
      ligne1: { type: String, trim: true, default: "" },
      ligne2: { type: String, trim: true, default: "" },
      ville: { type: String, trim: true, default: "" },
      region: { type: String, trim: true, default: "" },
      codePostal: { type: String, trim: true, default: "" },
      pays: { type: String, trim: true, default: "" },
    },

    // Médias
    photoUrl: { type: String, default: "" }, // ex: uploads/commerciaux/photos/xxx.jpg

    // Pièce d’identité
    pieceIdentite: {
      typePiece: {
        type: String,
        enum: ["CNI", "PASSPORT", "PERMIS", "AUTRE"],
        default: "AUTRE",
      },
      numero: { type: String, trim: true, default: "" },
      fichierUrl: { type: String, default: "" }, // ex: uploads/commerciaux/identites/xxx.pdf
      dateDelivrance: { type: Date },
      dateExpiration: { type: Date },
    },

    // Rémunération à la vente d’une parcelle
    commission: {
      mode: { type: String, enum: ["pourcentage", "fixe"], default: "pourcentage" },
      valeur: { type: Number, default: 0, min: 0 }, // % de 0–100 ou montant
      devise: { type: String, default: "XOF" }, // utilisé quand mode = 'fixe'
      actif: { type: Boolean, default: true },
    },

    // (Optionnel) suivi des affectations
    assignedParcelles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Parcelle" }],
    assignedIlots: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ilot" }],
  },
  { timestamps: true }
);

// Validation de la commission
ProfilCommercialSchema.path("commission.valeur").validate(function (v) {
  if (this.commission.mode === "pourcentage") {
    return v >= 0 && v <= 100;
  }
  return v >= 0; // montant fixe
}, "Valeur de commission invalide.");

module.exports = mongoose.model("ProfilCommercial", ProfilCommercialSchema);
