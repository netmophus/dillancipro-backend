// models/banque/IHE.js
// Immobilisation Hors Exploitation
const mongoose = require("mongoose");

const IHESchema = new mongoose.Schema(
  {
    // Référence unique
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Type de bien IHE
    type: {
      type: String,
      enum: ["terrain", "jardin", "maison", "appartement", "villa", "bureau", "entrepot", "autre"],
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

    // Nom du client (propriétaire d'origine ou client lié à l'IHE)
    nomClient: {
      type: String,
      trim: true,
      index: true,
    },

    // Localisation et référence
    pays: {
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
    referenceTitreFoncier: {
      type: String,
      trim: true,
      index: true,
    },

    // Informations essentielles
    dateEntreeIHE: {
      type: Date,
      index: true,
    },
    valeurComptableBruteEntree: {
      type: Number,
      min: 0,
    },

    // Valeurs financières
    // Origine de l'IHE
    origineIHE: {
      type: String,
      enum: ["adjudication", "dation", "achat", "autre", ""],
    },
    // Valeur d'adjudication ou de dation en paiement
    valeurAdjudication: {
      type: Number,
      min: 0,
    },
    valeurDation: {
      type: Number,
      min: 0,
    },
    // Valeur nette comptable (valeur comptable nette après amortissements)
    valeurNetteComptable: {
      type: Number,
      min: 0,
    },
    // Valeur comptable brute (valeur d'origine)
    valeurComptable: {
      type: Number,
      required: true,
      min: 0,
    },
    // Valeur d'acquisition (valeur d'achat initiale)
    valeurAcquisition: {
      type: Number,
      min: 0,
    },
    // Valeur de cession (prix de vente ou valeur estimée de cession)
    valeurCession: {
      type: Number,
      min: 0,
    },
    dateAcquisition: {
      type: Date,
    },

    // Suivi réglementaire et cession
    // Type réglementaire d'IHE
    typeReglementaireIHE: {
      type: String,
      enum: ["reprise_garantie", "autre", ""],
    },
    // Date d'entrée en IHE (réglementaire) pour calcul 24 mois
    dateEntreeIHEReglementaire: {
      type: Date,
      index: true,
    },
    // Date limite réglementaire de cession (24 mois pour reprise de garantie)
    dateLimiteReglementaire: {
      type: Date,
      index: true,
    },
    // Prorogation Commission bancaire
    prorogationCommissionBancaire: {
      type: Boolean,
      default: false,
    },
    dateDecisionProrogation: {
      type: Date,
    },
    nouvelleDateLimiteCession: {
      type: Date,
    },
    // Inclusion dans le plafond 15%
    inclusDansPlafond15: {
      type: Boolean,
      default: true,
      index: true,
    },
    motifExclusionPlafond: {
      type: String,
      enum: ["reprise_2_ans", "logement_personnel", "autre", ""],
    },
    // Anciens champs (pour compatibilité)
    // Date à laquelle le bien a été reclassé en IHE
    dateReclassement: {
      type: Date,
      index: true,
    },
    // Durée maximale de détention autorisée (en mois)
    // Par défaut : 60 mois (5 ans) selon réglementation bancaire
    dureeMaximaleDetention: {
      type: Number,
      min: 1,
      max: 120, // Maximum 10 ans
      default: 60, // 5 ans par défaut
    },
    // Date limite de cession calculée automatiquement
    // Calculée comme : dateReclassement + dureeMaximaleDetention
    dateLimiteCession: {
      type: Date,
      index: true,
    },
    // Plan de cession (document, stratégie, notes)
    planCession: {
      type: String,
      trim: true,
    },
    // Statut d'alerte réglementaire (calculé automatiquement)
    // "ok" : Plus de 6 mois avant la date limite
    // "attention" : Entre 3 et 6 mois avant la date limite
    // "urgent" : Moins de 3 mois avant la date limite
    // "depasse" : Date limite dépassée
    statutAlerteReglementaire: {
      type: String,
      enum: ["ok", "attention", "urgent", "depasse"],
      default: "ok",
      index: true,
    },
    // Date de dernière vérification de l'alerte
    derniereVerificationAlerte: {
      type: Date,
    },

    // Superficie
    superficie: {
      type: Number,
      min: 0,
    },
    uniteSuperficie: {
      type: String,
      enum: ["m²", "ha", "are"],
      default: "m²",
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
        required: true,
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

    // Statut de l'IHE
    statut: {
      type: String,
      enum: ["en_attente_validation", "a_corriger", "valide", "rejete", "en_vente", "vendu", "en_location", "loue"],
      default: "en_attente_validation",
      index: true,
    },

    // Caractéristiques spécifiques
    caracteristiques: {
      // Pour Maison/Villa/Appartement/Bureau
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
    },

    // Gestion de la banque - ISOLATION PAR BANQUE
    banqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // User avec role "Banque"
      required: true,
      index: true,
    },

    // Workflow de validation
    saisiPar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Utilisateur qui a saisi l'IHE
      required: true,
    },
    validePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Manager banque ou Admin qui a validé
    },
    valideLe: {
      type: Date,
    },
    rejetePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Manager banque ou Admin qui a rejeté
    },
    rejeteLe: {
      type: Date,
    },
    motifRejet: {
      type: String,
      trim: true,
    },

    // Partage avec agences partenaires
    partageAvecAgences: [
      {
        agenceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Agence",
        },
        partagePar: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Admin banque qui a partagé
        },
        partageLe: {
          type: Date,
          default: Date.now,
        },
        statut: {
          type: String,
          enum: ["propose", "accepte", "refuse"],
          default: "propose",
        },
      },
    ],

    // Informations complémentaires
    referenceClientInterne: {
      type: String,
      trim: true,
      index: true,
    },
    referencePretOrigine: {
      type: String,
      trim: true,
    },
    referenceGarantie: {
      type: String,
      trim: true,
    },

    // Métadonnées
    notes: {
      type: String,
      trim: true,
    },
    // Commentaires (champ spécifique pour les commentaires généraux)
    commentaires: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index composés pour les recherches
IHESchema.index({ banqueId: 1, statut: 1 });
IHESchema.index({ banqueId: 1, type: 1 });
IHESchema.index({ "localisation.latitude": 1, "localisation.longitude": 1 });
IHESchema.index({ banqueId: 1, dateLimiteCession: 1 });
IHESchema.index({ banqueId: 1, statutAlerteReglementaire: 1 });
IHESchema.index({ dateLimiteCession: 1, statutAlerteReglementaire: 1 });

// Générer une référence unique avant la sauvegarde
IHESchema.pre("save", async function (next) {
  if (!this.reference) {
    const prefix = "IHE";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.reference = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Calculer automatiquement la date limite de cession et le statut d'alerte
IHESchema.pre("save", function (next) {
  // Calculer dateLimiteCession si dateReclassement et dureeMaximaleDetention sont définis (ancien système)
  if (this.dateReclassement && this.dureeMaximaleDetention) {
    const dateReclassement = new Date(this.dateReclassement);
    const dateLimite = new Date(dateReclassement);
    dateLimite.setMonth(dateLimite.getMonth() + this.dureeMaximaleDetention);
    this.dateLimiteCession = dateLimite;
  }

  // Calculer automatiquement dateLimiteReglementaire (24 mois BCEAO) si typeReglementaireIHE = "reprise_garantie"
  // et si elle n'est pas déjà définie ou si les champs nécessaires ont changé
  if (this.typeReglementaireIHE === "reprise_garantie" && !this.dateLimiteReglementaire) {
    const dateEntree = this.dateEntreeIHEReglementaire || this.dateEntreeIHE;
    if (dateEntree) {
      const dateEntreeObj = new Date(dateEntree);
      const dateLimiteReglementaire = new Date(dateEntreeObj);
      dateLimiteReglementaire.setMonth(dateLimiteReglementaire.getMonth() + 24); // +24 mois (2 ans BCEAO)
      this.dateLimiteReglementaire = dateLimiteReglementaire;
    }
  }

  // PRIORITÉ : Calculer le statut d'alerte réglementaire basé sur dateLimiteReglementaire (24 mois BCEAO)
  // Si dateLimiteReglementaire existe, l'utiliser pour les alertes réglementaires
  // Sinon, utiliser dateLimiteCession (ancien système)
  const dateLimitePourAlertes = this.dateLimiteReglementaire || this.dateLimiteCession;
  
  if (dateLimitePourAlertes) {
    const maintenant = new Date();
    const dateLimite = new Date(dateLimitePourAlertes);
    const diffMois = Math.floor(
      (dateLimite - maintenant) / (1000 * 60 * 60 * 24 * 30)
    );

    if (diffMois < 0) {
      // Date limite dépassée
      this.statutAlerteReglementaire = "depasse";
    } else if (diffMois <= 3) {
      // Moins de 3 mois avant la date limite
      this.statutAlerteReglementaire = "urgent";
    } else if (diffMois <= 6) {
      // Entre 3 et 6 mois avant la date limite
      this.statutAlerteReglementaire = "attention";
    } else if (diffMois <= 12) {
      // Entre 6 et 12 mois avant la date limite (alerte à 1 an)
      this.statutAlerteReglementaire = "preavis_1_an";
    } else {
      // Plus de 12 mois avant la date limite
      this.statutAlerteReglementaire = "ok";
    }

    // Mettre à jour la date de dernière vérification
    this.derniereVerificationAlerte = maintenant;
  }

  next();
});

module.exports = mongoose.model("IHE", IHESchema);

