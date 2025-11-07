// models/PatrimoineFoncier.js
const mongoose = require("mongoose");

const PatrimoineFoncierSchema = new mongoose.Schema(
  {
    // Propriétaire
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Type de bien
    type: {
      type: String,
      enum: ["parcelle", "terrain", "maison", "villa", "appartement", "jardin", "autre"],
      required: true,
      index: true,
    },

    // Informations de base
    reference: {
      type: String,
      trim: true,
    },
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    superficie: {
      type: Number,
      min: 0,
    },
    valeurEstimee: {
      type: Number,
      min: 0,
    },

    // Localisation
    localisation: {
      adresse: {
        type: String,
        trim: true,
      },
      ville: {
        type: String,
        trim: true,
      },
      quartier: {
        type: String,
        trim: true,
      },
      commune: {
        type: String,
        trim: true,
      },
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },

    // Informations juridiques
    titreFoncier: {
      type: String,
      trim: true,
    },
    numeroTitre: {
      type: String,
      trim: true,
    },
    dateAcquisition: {
      type: Date,
    },
    modeAcquisition: {
      type: String,
      enum: ["achat", "heritage", "donation", "autre", ""],
      default: "",
    },

    // Documents et médias
    documents: [
      {
        type: String, // URLs Cloudinary
      },
    ],
    photos: [
      {
        type: String, // URLs Cloudinary
      },
    ],
    videoUrl: {
      type: String, // URL vidéo (Vimeo, YouTube, etc.)
      trim: true,
    },

    // Statut
    statut: {
      type: String,
      enum: ["possede", "en_vente", "loue", "autre"],
      default: "possede",
      index: true,
    },

    // Paiement ENREGISTREMENT (une seule fois)
    enregistrementStatut: {
      type: String,
      enum: ["en_attente", "paye"],
      default: "en_attente",
      index: true,
    },
    
    paiementEnregistrementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaiementPatrimoine",
    },
    
    montantEnregistrement: {
      type: Number,
      default: 0,
    },
    
    dateEnregistrement: Date,
    
    // Abonnement ANNUEL (récurrent)
    abonnementStatut: {
      type: String,
      enum: ["en_attente", "actif", "expire"],
      default: "en_attente",
      index: true,
    },
    
    dernierPaiementAbonnementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaiementPatrimoine",
    },
    
    dateDebutAbonnement: Date,
    
    dateExpirationAbonnement: Date, // 1 an après dernier paiement
    
    historiqueAbonnements: [{
      paiementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PaiementPatrimoine",
      },
      datePaiement: Date,
      montant: Number,
    }],
    
    // Visibilité (contrôlée MANUELLEMENT par admin si abonnement expiré)
    visible: {
      type: Boolean,
      default: false, // Invisible jusqu'au paiement enregistrement
      index: true,
    },
    
    desactivePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin qui a désactivé
    },
    
    dateDesactivation: Date,
    
    motifDesactivation: String,

    // Source du patrimoine (manuel, achat agence, ou achat particulier)
    source: {
      type: String,
      enum: ["manuel", "agence", "achat_particulier"],
      default: "manuel",
      index: true,
    },
    
    // Si source = "agence", référence à la vente agence
    venteAgenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vente",
    },
    
    // Agence d'origine (si achat via agence)
    agenceOrigine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agence",
    },
    
    // Type de bien agence (parcelle ou bien immobilier)
    typeBienAgence: {
      type: String,
      enum: ["parcelle", "bien"],
    },

    // Historique de vente (si achat particulier)
    ancienProprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    dateAcquisitionVente: Date,
    
    dateVente: Date,
    acheteurNom: String,
    acheteurPhone: String,

    // Soumission à la vente via Softlink
    soumiseVente: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    venteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VentePatrimoine",
    },

    // Vérification par Softlink
    statutVerification: {
      type: String,
      enum: ["non_verifie", "en_cours", "verifie", "rejete"],
      default: "non_verifie",
      index: true,
    },
    
    verifiePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin Softlink
    },
    
    dateVerification: Date,
    
    notesVerification: String,
    
    documentsVerification: [
      {
        url: String, // URL Cloudinary du document
        description: String, // Description du document
      },
    ],
    
    motifRejetVerification: String,

    // Caractéristiques optionnelles
    caracteristiques: {
      bornage: {
        type: Boolean,
        default: false,
      },
      cloture: {
        type: Boolean,
        default: false,
      },
      viabilise: {
        type: Boolean,
        default: false,
      },
      accesBitume: {
        type: Boolean,
        default: false,
      },
      electricite: {
        type: Boolean,
        default: false,
      },
      eau: {
        type: Boolean,
        default: false,
      },
    },

    // Notes privées
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour recherches optimisées
PatrimoineFoncierSchema.index({ clientId: 1, type: 1 });
PatrimoineFoncierSchema.index({ clientId: 1, statut: 1 });

module.exports = mongoose.model("PatrimoineFoncier", PatrimoineFoncierSchema);

