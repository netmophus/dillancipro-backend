// models/agences/Location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  // Informations de base
  titre: {
    type: String,
    required: [true, "Le titre est obligatoire"],
    trim: true,
    maxlength: [100, "Le titre ne peut pas dépasser 100 caractères"]
  },
  description: {
    type: String,
    required: [true, "La description est obligatoire"],
    trim: true,
    maxlength: [1000, "La description ne peut pas dépasser 1000 caractères"]
  },
  type: {
    type: String,
    required: [true, "Le type de logement est obligatoire"],
    enum: ["Villa", "Appartement", "Studio", "Maison", "Duplex", "Chambre", "Autre"],
    default: "Appartement"
  },

  // Localisation
  ville: {
    type: String,
    required: [true, "La ville est obligatoire"],
    trim: true
  },
  quartier: {
    type: String,
    required: [true, "Le quartier est obligatoire"],
    trim: true
  },
  adresse: {
    type: String,
    required: [true, "L'adresse est obligatoire"],
    trim: true
  },
  codePostal: {
    type: String,
    trim: true
  },

  // Coordonnées GPS
  coordonnees: {
    latitude: {
      type: Number,
      required: [true, "La latitude est obligatoire"],
      min: [-90, "Latitude invalide"],
      max: [90, "Latitude invalide"]
    },
    longitude: {
      type: Number,
      required: [true, "La longitude est obligatoire"],
      min: [-180, "Longitude invalide"],
      max: [180, "Longitude invalide"]
    }
  },

  // Caractéristiques du logement
  superficie: {
    type: Number,
    required: [true, "La superficie est obligatoire"],
    min: [1, "La superficie doit être positive"]
  },
  chambres: {
    type: Number,
    required: [true, "Le nombre de chambres est obligatoire"],
    min: [0, "Le nombre de chambres ne peut pas être négatif"]
  },
  salleDeBain: {
    type: Number,
    required: [true, "Le nombre de salles de bain est obligatoire"],
    min: [0, "Le nombre de salles de bain ne peut pas être négatif"]
  },
  cuisine: {
    type: Boolean,
    default: true
  },
  salon: {
    type: Boolean,
    default: true
  },
  balcon: {
    type: Boolean,
    default: false
  },
  jardin: {
    type: Boolean,
    default: false
  },
  garage: {
    type: Boolean,
    default: false
  },
  parking: {
    type: Boolean,
    default: false
  },
  ascenseur: {
    type: Boolean,
    default: false
  },
  climatisation: {
    type: Boolean,
    default: false
  },
  chauffage: {
    type: Boolean,
    default: false
  },
  internet: {
    type: Boolean,
    default: false
  },
  meuble: {
    type: Boolean,
    default: false
  },

  // Prix et conditions
  prixMensuel: {
    type: Number,
    required: [true, "Le prix mensuel est obligatoire"],
    min: [0, "Le prix ne peut pas être négatif"]
  },
  caution: {
    type: Number,
    required: [true, "La caution est obligatoire"],
    min: [0, "La caution ne peut pas être négative"]
  },
  charges: {
    type: Number,
    default: 0,
    min: [0, "Les charges ne peuvent pas être négatives"]
  },
  chargesIncluses: {
    type: Boolean,
    default: false
  },

  // Disponibilité
  statut: {
    type: String,
    enum: ["disponible", "loue", "indisponible", "en_attente"],
    default: "disponible"
  },
  dateDisponibilite: {
    type: Date,
    required: [true, "La date de disponibilité est obligatoire"]
  },
  dureeMinimale: {
    type: Number,
    default: 1,
    min: [1, "La durée minimale doit être d'au moins 1 mois"]
  },
  dureeMaximale: {
    type: Number,
    min: [1, "La durée maximale doit être d'au moins 1 mois"]
  },

  // Médias
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ""
    },
    ordre: {
      type: Number,
      default: 0
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
    },
  }],
  videoUrl: {
    type: String,
    trim: true
  },
  plan: {
    url: String,
    alt: String
  },

  // Documents
  documents: [{
    nom: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["contrat", "reglement", "certificat", "autre"],
      default: "autre"
    }
  }],

  // Propriétaire et agence
  proprietaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Le propriétaire est obligatoire"]
  },
  agenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agence",
    required: [true, "L'agence est obligatoire"]
  },
  commercial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProfilCommercial"
  },

  // Locataire actuel
  locataireActuel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  dateDebutLocation: {
    type: Date
  },
  dateFinLocation: {
    type: Date
  },

  // Visites
  visites: [{
    visiteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    dateVisite: {
      type: Date,
      required: true
    },
    statut: {
      type: String,
      enum: ["planifiee", "effectuee", "annulee"],
      default: "planifiee"
    },
    commentaire: String
  }],

  // Demandes de location
  demandes: [{
    demandeur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    dateDemande: {
      type: Date,
      default: Date.now
    },
    statut: {
      type: String,
      enum: ["en_attente", "acceptee", "refusee", "annulee"],
      default: "en_attente"
    },
    message: String,
    dureeSouhaitee: Number,
    dateDebutSouhaitee: Date
  }],

  // Évaluations
  evaluations: [{
    evaluateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    note: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    commentaire: String,
    dateEvaluation: {
      type: Date,
      default: Date.now
    }
  }],

  // Statistiques
  nombreVues: {
    type: Number,
    default: 0
  },
  nombreFavoris: {
    type: Number,
    default: 0
  },
  nombreDemandes: {
    type: Number,
    default: 0
  },

  // Métadonnées
  tags: [String],
  motsCles: [String],
  reference: {
    type: String,
    unique: true,
    sparse: true
  },

  // Dates
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour les recherches
locationSchema.index({ ville: 1, quartier: 1 });
locationSchema.index({ type: 1 });
locationSchema.index({ prixMensuel: 1 });
locationSchema.index({ statut: 1 });
locationSchema.index({ agenceId: 1 });
locationSchema.index({ proprietaire: 1 });
locationSchema.index({ "coordonnees.latitude": 1, "coordonnees.longitude": 1 });

// Middleware pour mettre à jour updatedAt
locationSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode pour générer une référence unique
locationSchema.statics.generateReference = function() {
  const prefix = "LOC";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${timestamp}-${random}`;
};

// Méthode pour calculer la note moyenne
locationSchema.methods.calculerNoteMoyenne = function() {
  if (this.evaluations.length === 0) return 0;
  const somme = this.evaluations.reduce((acc, eval) => acc + eval.note, 0);
  return (somme / this.evaluations.length).toFixed(1);
};

// Méthode pour vérifier la disponibilité
locationSchema.methods.estDisponible = function() {
  return this.statut === "disponible" && new Date() >= this.dateDisponibilite;
};

module.exports = mongoose.model("Location", locationSchema);
