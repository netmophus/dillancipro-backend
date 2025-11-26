const mongoose = require("mongoose");

const DemandeCreditHypothecaireSchema = new mongoose.Schema(
  {
    // Référence unique de la demande (générée automatiquement)
    reference: {
      type: String,
      required: false, // Générée automatiquement dans le hook pre-save
      unique: true,
      trim: true,
    },

    // Banque qui soumet la demande (User avec role "Banque")
    banqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Notaire assigné pour traiter la demande
    notaireId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notaire",
      required: true,
      index: true,
    },

    // Informations sur le crédit
    montantCredit: {
      type: Number,
      required: true,
      min: 0,
    },

    devise: {
      type: String,
      default: "FCFA",
      enum: ["FCFA", "EUR", "USD"],
    },

    dureeRemboursement: {
      type: Number, // en mois
      required: true,
      min: 1,
    },

    tauxInteret: {
      type: Number, // en pourcentage annuel
      required: true,
      min: 0,
      max: 100,
    },

    // Informations sur le bien immobilier (peut être lié à une IHE)
    bienImmobilier: {
      type: {
        type: String,
        enum: ["maison", "appartement", "terrain", "villa", "bureau", "autre"],
        required: true,
      },
      adresse: {
        type: String,
        required: true,
      },
      ville: {
        type: String,
        required: true,
      },
      quartier: {
        type: String,
      },
      superficie: {
        type: Number,
        min: 0,
      },
      valeurEstimee: {
        type: Number,
        required: true,
        min: 0,
      },
      // Optionnel : référence à une IHE existante
      iheId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "IHE",
      },
    },

    // Informations sur l'emprunteur
    emprunteur: {
      nom: {
        type: String,
        required: true,
      },
      prenom: {
        type: String,
        required: true,
      },
      telephone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        lowercase: true,
      },
      adresse: {
        type: String,
      },
      profession: {
        type: String,
      },
      numeroCNI: {
        type: String,
      },
    },

    // Statut du workflow
    statut: {
      type: String,
      enum: [
        "soumis_par_banque", // Banque a soumis le titre de propriété et la notification
        "en_traitement_notaire", // Notaire traite la demande
        "convention_formalisee", // Convention d'ouverture de crédit formalisée par le notaire
        "inscription_hypothecaire_en_cours", // Inscription hypothécaire en cours
        "inscription_hypothecaire_terminee", // Inscription hypothécaire terminée
        "credit_octroye", // Crédit octroyé
        "rejete", // Demande rejetée
        "annule", // Demande annulée
      ],
      default: "soumis_par_banque",
      index: true,
    },

    // Documents soumis par la banque
    documentsBanque: {
      titrePropriete: {
        url: String,
        nom: String,
        dateUpload: Date,
      },
      notificationCredit: {
        url: String,
        nom: String,
        dateUpload: Date,
      },
      autresDocuments: [
        {
          type: String, // Type de document
          url: String,
          nom: String,
          dateUpload: Date,
        },
      ],
    },

    // Documents générés par le notaire
    documentsNotaire: {
      conventionOuvertureCredit: {
        url: String,
        nom: String,
        dateCreation: Date,
        numeroConvention: String,
      },
      acteHypothecaire: {
        url: String,
        nom: String,
        dateCreation: Date,
        numeroActe: String,
      },
      autresDocuments: [
        {
          type: String,
          url: String,
          nom: String,
          dateCreation: Date,
        },
      ],
    },

    // Dates importantes
    dateSoumission: {
      type: Date,
      default: Date.now,
    },

    dateTraitementNotaire: {
      type: Date,
    },

    dateConventionFormalisee: {
      type: Date,
    },

    dateInscriptionHypothecaire: {
      type: Date,
    },

    dateCreditOctroye: {
      type: Date,
    },

    // Commentaires et notes
    commentairesBanque: {
      type: String,
      trim: true,
    },

    commentairesNotaire: {
      type: String,
      trim: true,
    },

    motifRejet: {
      type: String,
      trim: true,
    },

    // Traçabilité
    soumisPar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    traitePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Notaire qui traite
    },

    // Priorité
    priorite: {
      type: String,
      enum: ["normale", "urgente", "tres_urgente"],
      default: "normale",
    },
  },
  {
    timestamps: true,
  }
);

// Index pour recherche et filtrage
DemandeCreditHypothecaireSchema.index({ banqueId: 1, statut: 1 });
DemandeCreditHypothecaireSchema.index({ notaireId: 1, statut: 1 });
DemandeCreditHypothecaireSchema.index({ reference: 1 });
DemandeCreditHypothecaireSchema.index({ "emprunteur.email": 1 });
DemandeCreditHypothecaireSchema.index({ createdAt: -1 });

// Pré-hook pour générer une référence unique
DemandeCreditHypothecaireSchema.pre("save", async function (next) {
  // Générer la référence uniquement si elle n'existe pas (nouvelle demande)
  if (!this.reference && this.isNew) {
    try {
      // Compter les documents existants pour générer un numéro séquentiel
      const count = await mongoose.model("DemandeCreditHypothecaire").countDocuments();
      const year = new Date().getFullYear();
      this.reference = `DCH-${String(count + 1).padStart(6, "0")}-${year}`;
    } catch (error) {
      // En cas d'erreur, générer une référence basée sur le timestamp
      const timestamp = Date.now().toString().slice(-8);
      const year = new Date().getFullYear();
      this.reference = `DCH-${timestamp}-${year}`;
    }
  }
  next();
});

module.exports = mongoose.model("DemandeCreditHypothecaire", DemandeCreditHypothecaireSchema);

