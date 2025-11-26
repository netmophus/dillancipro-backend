const mongoose = require('mongoose');

const BanqueSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  services: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  produits: {
    type: [String],
    default: [],
  },
  avantages: {
    type: [String],
    default: [],
  },
  contact: {
    telephone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    siteWeb: {
      type: String,
      trim: true,
    },
  },
  adresse: {
    type: String,
    trim: true,
  },
  localisation: {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  logo: {
    type: String,
    trim: true,
  },
  actif: {
    type: Boolean,
    default: true,
  },
  ordre: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Banque', BanqueSchema);

