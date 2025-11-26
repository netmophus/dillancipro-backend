// models/banque/IHEMedia.js
// Médias et documents pour les IHE (photos, vidéos, documents avec titre et description)
const mongoose = require("mongoose");

const IHEMediaSchema = new mongoose.Schema(
  {
    // Référence à l'IHE
    iheId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IHE",
      required: true,
      index: true,
    },

    // Type de média
    type: {
      type: String,
      enum: ["photo", "video", "document"],
      required: true,
      index: true,
    },

    // Titre du média/document
    titre: {
      type: String,
      required: true,
      trim: true,
    },

    // Description du média/document
    description: {
      type: String,
      trim: true,
    },

    // URL du fichier (Cloudinary pour photos/documents, YouTube/Vimeo pour vidéos)
    url: {
      type: String,
      required: true,
    },

    // Pour les documents : type de fichier (PDF, DOCX, etc.)
    typeFichier: {
      type: String,
      enum: ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png", "mp4", "avi", "autre"],
    },

    // Ordre d'affichage
    ordre: {
      type: Number,
      default: 0,
    },

    // Métadonnées
    taille: {
      type: Number, // Taille en bytes
    },
    duree: {
      type: Number, // Pour les vidéos, durée en secondes
    },

    // Uploadé par
    uploadPar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index composés
IHEMediaSchema.index({ iheId: 1, type: 1 });
IHEMediaSchema.index({ iheId: 1, ordre: 1 });

module.exports = mongoose.model("IHEMedia", IHEMediaSchema);

