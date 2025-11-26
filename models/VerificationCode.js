const mongoose = require("mongoose");

const VerificationCodeSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: function() {
      const emailValue = this.email && typeof this.email === "string" ? this.email.trim() : "";
      return emailValue === "";
    },
    index: true,
    sparse: true,
  },
  email: {
    type: String,
    required: function() {
      const phoneValue = this.phone && typeof this.phone === "string" ? this.phone.trim() : "";
      return phoneValue === "";
    },
    index: true,
    sparse: true,
    lowercase: true,
  },
  code: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    // Note: On ne met pas d'index TTL ici car on veut garder une trace des codes vérifiés
    // Les codes non vérifiés expirés seront supprimés manuellement dans le contrôleur
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Validation pour s'assurer qu'au moins phone ou email est fourni
VerificationCodeSchema.pre("validate", function (next) {
  const phoneValue = this.phone && typeof this.phone === "string" ? this.phone.trim() : "";
  const emailValue = this.email && typeof this.email === "string" ? this.email.trim() : "";
  
  if (phoneValue === "" && emailValue === "") {
    this.invalidate("phone", "Au moins un numéro de téléphone ou un email doit être fourni");
    this.invalidate("email", "Au moins un numéro de téléphone ou un email doit être fourni");
  }
  next();
});

// Index pour faciliter la recherche par téléphone/email et code
VerificationCodeSchema.index({ phone: 1, code: 1 }, { sparse: true });
VerificationCodeSchema.index({ email: 1, code: 1 }, { sparse: true });
VerificationCodeSchema.index({ userId: 1, verified: 1 });
// Note: On ne met pas d'index TTL ici car on veut garder une trace des codes vérifiés
// Les codes non vérifiés expirés seront supprimés manuellement dans le contrôleur si nécessaire

module.exports = mongoose.model("VerificationCode", VerificationCodeSchema);

