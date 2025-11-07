// const mongoose = require("mongoose");

// const IlotSchema = new mongoose.Schema({
//   numeroIlot: { type: String, required: true, trim: true },
//   zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true, index: true },
//   quartier: { type: mongoose.Schema.Types.ObjectId, ref: "Quartier", required: true, index: true },
//   agenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Agence", required: true, index: true }, // ← AJOUT
//   surfaceTotale: { type: Number, default: 0 },
//   affecteA: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 👈 commercial assigné
// }, { timestamps: true });

// module.exports = mongoose.model("Ilot", IlotSchema);




// models/agences/Ilot.js
const mongoose = require("mongoose");

const IlotSchema = new mongoose.Schema(
  {
    numeroIlot: { type: String, required: true, trim: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true, index: true },
    quartier: { type: mongoose.Schema.Types.ObjectId, ref: "Quartier", required: true, index: true },
    agenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Agence", required: true, index: true },
    surfaceTotale: { type: Number, default: 0 },
    affecteA: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 👈 commercial assigné
  },
  { timestamps: true }
);

IlotSchema.index({ zone: 1, numeroIlot: 1 }, { unique: true });

module.exports = mongoose.model("Ilot", IlotSchema);
