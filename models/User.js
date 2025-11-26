// const mongoose = require("mongoose");

// const UserSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     phone: { type: String, required: true, unique: true },
//     email: { type: String, unique: true, sparse: true }, // Facultatif, mais unique si fourni
//     password: { type: String, required: true }, // Stocké haché
//     role: {
//       type: String,
//       enum: ["banque", "agence", "client", "admin", "ministere"], // Ajout de "ministere"
//       required: true,
//     },
//     isActive: { type: Boolean, default: true }, // Pour désactiver un compte si besoin
//     trackSessions: { type: Boolean, default: false }, // Option pour suivre les connexions (activé/désactivé)
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("User", UserSchema);




// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // 👈

const UserSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: function() {
      return !this.email || this.email.trim() === "";
    },
    unique: true,
    sparse: true, // Permet plusieurs documents sans phone si email est présent
  },

  fullName: {
      type: String,
      trim: true,
      default: "",           // optionnel
    },

   email: {
      type: String,
      trim: true,
      lowercase: true,
      required: function() {
        return !this.phone || this.phone.trim() === "";
      },
      unique: true,   // unicité seulement si présent
      sparse: true,   // autorise plusieurs docs sans email
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Adresse email invalide",
      },
    },


    
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["Admin", "Agence", "Banque", "Ministere", "Commercial", "User", "Notaire"],
    default: "User",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  trackSessions: {
    type: Boolean,
    default: false,
  },
  agenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agence",
    required: false, // Pas obligatoire pour tous les utilisateurs
  },
}, { timestamps: true });



// Validation personnalisée pour s'assurer qu'au moins phone ou email est fourni
UserSchema.pre("validate", function (next) {
  if ((!this.phone || this.phone.trim() === "") && (!this.email || this.email.trim() === "")) {
    this.invalidate("phone", "Au moins un numéro de téléphone ou un email doit être fourni");
    this.invalidate("email", "Au moins un numéro de téléphone ou un email doit être fourni");
  }
  next();
});

UserSchema.pre("save", async function (next) {
  // Si le champ n'a pas été modifié, on ne fait rien
  if (!this.isModified("password")) return next();

  // Si le mot de passe semble déjà haché, on ne fait rien
  if (this.password.startsWith("$2a$") || this.password.startsWith("$2b$")) {
    return next();
  }

  // Sinon, on le hache
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


module.exports = mongoose.model("User", UserSchema);
