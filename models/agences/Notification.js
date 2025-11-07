const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Agence", index: true },

    type: { type: String, default: "INFO" }, // AFFECTATION_PARCELLE, AFFECTATION_ILOT, PAIEMENT_PARTIEL, etc.
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },     // ex: /commercial/parcelles-vendues
    meta: { type: Object, default: {} },

    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
