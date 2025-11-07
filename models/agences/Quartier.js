const mongoose = require("mongoose");

const QuartierSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  ville: { type: mongoose.Schema.Types.ObjectId, ref: "Ville", required: true },
  // Pas d'agenceId - partagé entre toutes les agences (données nationales)

  description: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Quartier", QuartierSchema);
