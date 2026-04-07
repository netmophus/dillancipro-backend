// scripts/createFirstAdmin.js
// Crée le premier compte administrateur directement en base de données
// Usage : node scripts/createFirstAdmin.js

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const ADMIN = {
  fullName: "Super Admin",
  email: "mlkane8383@gmail.com",
  phone: "+22780648383",   // ← modifiez si nécessaire
  password: "22041968",  // ← changez ce mot de passe après connexion !
  role: "Admin",
  isActive: true,
};

async function createFirstAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connecté à MongoDB");

    // Vérifie qu'il n'existe pas déjà un admin
    const existing = await User.findOne({ role: "Admin" });
    if (existing) {
      console.log(`⚠️  Un compte Admin existe déjà : ${existing.email || existing.phone}`);
      process.exit(0);
    }

    const admin = new User(ADMIN);
    await admin.save();

    console.log("🎉 Compte administrateur créé avec succès !");
    console.log(`   Email    : ${ADMIN.email}`);
    console.log(`   Téléphone: ${ADMIN.phone}`);
    console.log(`   Mot de passe initial : ${ADMIN.password}`);
    console.log("⚠️  Changez le mot de passe dès la première connexion !");
  } catch (err) {
    console.error("❌ Erreur :", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

createFirstAdmin();
