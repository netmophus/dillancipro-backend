// models/agences/BienImmobilier.js
const mongoose = require("mongoose");

const BienImmobilierSchema = new mongoose.Schema(
  {
    // Type de bien
    type: {
      type: String,
      enum: ["maison", "jardin", "terrain", "appartement", "villa", "duplex", "autre"],
      required: true,
      index: true,
    },

    // Informations de base
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    prix: {
      type: Number,
      required: true,
      min: 0,
    },
    superficie: {
      type: Number,
      min: 0,
    },
    statut: {
      type: String,
      enum: ["disponible", "en_cours_de_vente", "vendu", "reserve"],
      default: "disponible",
      index: true,
    },

    // Localisation complète
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
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },

    // Médias
    images: [
      {
        type: String, // URLs Cloudinary
      },
    ],
    videos: [
      {
        type: String, // URLs Vimeo, YouTube, etc.
      },
    ],
    documents: [
      {
        type: String, // URLs des documents PDF, etc.
      },
    ],
    visite360: {
      type: String, // URL visite virtuelle
    },

    // Caractéristiques spécifiques
    caracteristiques: {
      // Pour Maison/Villa/Duplex/Appartement
      nbChambres: {
        type: Number,
        min: 0,
      },
      nbSallesBain: {
        type: Number,
        min: 0,
      },
      nbSalons: {
        type: Number,
        min: 0,
      },
      garage: {
        type: Boolean,
        default: false,
      },
      piscine: {
        type: Boolean,
        default: false,
      },
      jardin: {
        type: Boolean,
        default: false,
      },
      climatisation: {
        type: Boolean,
        default: false,
      },
      cuisine: {
        type: String,
        enum: ["equipee", "moderne", "standard", "aucune", ""],
        default: "",
      },

      // Pour Jardin
      irrigation: {
        type: Boolean,
        default: false,
      },
      cloture: {
        type: Boolean,
        default: false,
      },
      arbore: {
        type: Boolean,
        default: false,
      },
      potager: {
        type: Boolean,
        default: false,
      },
      // Types d'arbres présents dans le jardin avec leur nombre
      typesArbres: [
        {
          type: {
            type: String,
            trim: true,
          },
          nombre: {
            type: Number,
            min: 0,
          },
        },
      ],
      // Description des éléments présents dans le jardin
      elementsJardin: {
        type: String,
        trim: true,
      },

      // Pour Appartement
      etage: {
        type: Number,
        min: 0,
      },
      ascenseur: {
        type: Boolean,
        default: false,
      },
      balcon: {
        type: Boolean,
        default: false,
      },

      // Caractéristiques communes
      anneeConstruction: {
        type: Number,
        min: 1800,
        max: new Date().getFullYear() + 5,
      },
      etatGeneral: {
        type: String,
        enum: ["neuf", "bon", "moyen", "a_renover", ""],
        default: "",
      },
      acces: {
        type: String,
        enum: ["goudron", "pave", "terre", "autre", ""],
        default: "",
      },
      electricite: {
        type: Boolean,
        default: false,
      },
      eau: {
        type: Boolean,
        default: false,
      },
      securite: {
        type: Boolean,
        default: false,
      },
    },

    // Gestion de l'agence
    agenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agence",
      required: true,
      index: true,
    },

    // Affectation et vente
    affecteeA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Commercial
      index: true,
    },
    vendueA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Client
    },
    dateVente: {
      type: Date,
    },

    // Marketing
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    urgent: {
      type: Boolean,
      default: false,
    },

    // Métadonnées
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index composés pour les recherches
BienImmobilierSchema.index({ agenceId: 1, type: 1, statut: 1 });
BienImmobilierSchema.index({ agenceId: 1, affecteeA: 1 });
BienImmobilierSchema.index({ prix: 1, superficie: 1 });

// Générer une référence unique avant la sauvegarde
BienImmobilierSchema.pre("save", async function (next) {
  if (!this.reference) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.reference = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model("BienImmobilier", BienImmobilierSchema);

