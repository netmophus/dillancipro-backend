const mongoose = require('mongoose');

const AgenceSchema = new mongoose.Schema({

agenceId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Agence',
},

  nom: {
    type: String,
    required: true,
    trim: true,
  },
  nif: {
    type: String,
    required: true,
    unique: true,
  },
  rccm: {
    type: String,
    required: true,
    unique: true,
  },
  statutJuridique: {
    type: String,
    required: true,
  },
  dateCreation: {
    type: Date,
    required: true,
  },
  promoteur: {
    type: String,
    required: true,
  },

  adresse: {
    type: String,
    required: true,
  },
  bp: {
    type: String,
  },
  ville: {
    type: String,
    required: true,
  },
  pays: {
    type: String,
    required: true,
  },
  telephone: {
    type: String,
    required: true,
  },

email: {
  type: String,
  validate: {
    validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: "Adresse email invalide",
  },
},
  localisation: {
    latitude: String,
    longitude: String,
  },

  description: {
    type: String,
  },

  fichiers: {
    nifFile: { type: String },         // chemin ou URL
    rccmFile: { type: String },
    statutFile: { type: String },
    autresFichiers: [{ type: String }], // tableau de fichiers
    logo: { type: String },
  },

  statut: {
    type: String,
    enum: ['actif', 'en_attente', 'suspendu', 'supprimé'],
    default: 'en_attente',
  },
  admin: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
},

}, {
  timestamps: true,
});


module.exports = mongoose.model("Agence", AgenceSchema);
