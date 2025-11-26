/**
 * Script pour recréer les index phone et email avec sparse: true
 * Ce script résout le problème E11000 duplicate key error pour les valeurs null
 * 
 * Usage: node scripts/fixUserIndexes.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");

async function fixUserIndexes() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("✅ Connecté à MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // Supprimer les anciens index
    try {
      await collection.dropIndex("phone_1");
      console.log("✅ Index phone_1 supprimé");
    } catch (err) {
      if (err.code !== 27) { // 27 = IndexNotFound
        console.log("⚠️  Erreur lors de la suppression de phone_1:", err.message);
      } else {
        console.log("ℹ️  Index phone_1 n'existe pas");
      }
    }

    try {
      await collection.dropIndex("email_1");
      console.log("✅ Index email_1 supprimé");
    } catch (err) {
      if (err.code !== 27) {
        console.log("⚠️  Erreur lors de la suppression de email_1:", err.message);
      } else {
        console.log("ℹ️  Index email_1 n'existe pas");
      }
    }

    // Recréer les index avec sparse: true
    await collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
    console.log("✅ Index phone recréé avec sparse: true");

    await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log("✅ Index email recréé avec sparse: true");

    console.log("\n✅ Migration terminée avec succès !");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    process.exit(1);
  }
}

fixUserIndexes();

