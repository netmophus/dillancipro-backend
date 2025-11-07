const mongoose = require("mongoose");

const PasswordResetCodeSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // Suppression automatique après expiration
  },
  verified: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index pour faciliter la recherche par téléphone et code
PasswordResetCodeSchema.index({ phone: 1, code: 1 });
PasswordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordResetCode", PasswordResetCodeSchema);

