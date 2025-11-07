// const mongoose = require("mongoose");

// const ZoneSchema = new mongoose.Schema({
//   nom: { type: String, required: true },
//   quartier: { type: mongoose.Schema.Types.ObjectId, ref: "Quartier", required: true },
//   description: { type: String, default: "" },
// }, { timestamps: true });

// module.exports = mongoose.model("Zone", ZoneSchema);




// models/agences/Zone.js
const mongoose = require("mongoose");

const ZoneSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    quartier: { type: mongoose.Schema.Types.ObjectId, ref: "Quartier", required: true, index: true },
    // Pas d'agenceId - partagé entre toutes les agences (données nationales)
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

// Évite les doublons de nom dans un même quartier
ZoneSchema.index({ quartier: 1, nom: 1 }, { unique: true });

module.exports = mongoose.model("Zone", ZoneSchema);
