// const mongoose = require("mongoose");

// const PartielPaiementSchema = new mongoose.Schema({
//   paiement: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Paiement",
//     required: true,
//   },
//   montant: {
//     type: Number,
//     required: true,
//   },
//   recuUrl: {
//     type: String,
//   },
//   datePaiement: {
//     type: Date,
//     default: Date.now,
//   },
// }, { timestamps: true });

// module.exports = mongoose.model("PartielPaiement", PartielPaiementSchema);




// models/PartielPaiement.js
const mongoose = require("mongoose");

const PartielPaiementSchema = new mongoose.Schema({
  paiement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paiement",
    required: true,
  },
  montant: {
    type: Number,
    required: true,
  },
  recuUrl: {
    type: String,
  },
  datePaiement: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model("PartielPaiement", PartielPaiementSchema);
