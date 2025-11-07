// const mongoose = require("mongoose");

// const PaiementSchema = new mongoose.Schema({
//   parcelle: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Parcelle",
//     required: true,
//     unique: true, // Une parcelle ne peut avoir qu'un seul paiement principal
//   },
//   client: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   typePaiement: {
//     type: String,
//     enum: ["total", "partiel"],
//     required: true,
//   },
//   montantTotal: {
//     type: Number,
//     required: true,
//   },
//   montantPaye: {
//     type: Number,
//     default: 0,
//   },
//   statut: {
//     type: String,
//     enum: ["paid", "unpaid"],
//     default: "unpaid",
//   },
//   recuUrl: String, // Pour un paiement total
//   datePaiement: {
//     type: Date,
//     default: Date.now,
//   },
// }, { timestamps: true });

// module.exports = mongoose.model("Paiement", PaiementSchema);




// models/Paiement.js
const mongoose = require("mongoose");

const PaiementSchema = new mongoose.Schema({
  parcelle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parcelle",
    required: true,
    unique: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  typePaiement: {
    type: String,
    enum: ["total", "partiel"],
    required: true,
  },
  montantTotal: {
    type: Number,
    required: true,
  },
  montantPaye: {
    type: Number,
    default: 0,
  },
  montantRestant: {
    type: Number,
    default: function () {
      return this.montantTotal;
    },
  },
  statut: {
    type: String,
    enum: ["paid", "unpaid"],
    default: "unpaid",
  },
  recuUrl: {
    type: String,
  },
  datePaiement: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model("Paiement", PaiementSchema);
