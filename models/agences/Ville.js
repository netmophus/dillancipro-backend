const mongoose = require("mongoose");

const VilleSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true,
  },
  region: {
    type: String,
    default: "",
  },
  codePostal: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  // Pas d'agenceId - partagé entre toutes les agences (données nationales)
}, {
  timestamps: true
});

module.exports = mongoose.model("Ville", VilleSchema);
