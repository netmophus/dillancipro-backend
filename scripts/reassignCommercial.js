// scripts/reassignCommercial.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Agence = require("../models/Agence");
const ProfilCommercial = require("../models/agences/ProfilCommercial");

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/geofoncier";

async function reassignCommercial() {
  try {
    console.log("🔄 Connexion à MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connecté à MongoDB\n");

    // 1. Afficher toutes les agences disponibles
    const agences = await Agence.find();
    console.log("📋 AGENCES DISPONIBLES :");
    console.log("=".repeat(60));
    agences.forEach((agence, index) => {
      console.log(`${index + 1}. ${agence.nom}`);
      console.log(`   ID: ${agence._id}`);
      console.log(`   Admin: ${agence.admin}`);
      console.log("");
    });

    // 2. Afficher tous les commerciaux avec leur agence actuelle
    const commerciaux = await User.find({ role: "Commercial" });
    console.log("👥 COMMERCIAUX EXISTANTS :");
    console.log("=".repeat(60));
    
    for (const commercial of commerciaux) {
      const profil = await ProfilCommercial.findOne({ userId: commercial._id });
      const agence = profil ? await Agence.findById(profil.agenceId) : null;
      
      console.log(`📍 ${commercial.fullName || commercial.phone}`);
      console.log(`   User ID: ${commercial._id}`);
      if (profil) {
        console.log(`   ProfilCommercial ID: ${profil._id}`);
        console.log(`   Agence actuelle: ${agence?.nom || 'Inconnue'} (${profil.agenceId})`);
      } else {
        console.log(`   ⚠️ Pas de ProfilCommercial`);
      }
      console.log("");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔧 RÉASSIGNATION");
    console.log("=".repeat(60));

    // 3. Trouver Abbas Sako
    const abbasSako = await User.findOne({ fullName: "Abbas Sako", role: "Commercial" });
    if (!abbasSako) {
      console.log("❌ Abbas Sako non trouvé");
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Abbas Sako trouvé (ID: ${abbasSako._id})`);

    // 4. Trouver l'agence "Agence KATAKO"
    const agenceKatako = await Agence.findOne({ nom: /Agence KATAKO/i });
    if (!agenceKatako) {
      console.log("❌ Agence KATAKO non trouvée");
      console.log("\nAgences disponibles :");
      agences.forEach(a => console.log(`  - ${a.nom}`));
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Agence KATAKO trouvée (ID: ${agenceKatako._id})`);

    // 5. Mettre à jour le ProfilCommercial
    const profilAbbas = await ProfilCommercial.findOne({ userId: abbasSako._id });
    if (!profilAbbas) {
      console.log("❌ ProfilCommercial d'Abbas Sako non trouvé");
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`\n🔄 Changement d'agence pour Abbas Sako :`);
    console.log(`   Ancienne agence: ${profilAbbas.agenceId}`);
    console.log(`   Nouvelle agence: ${agenceKatako._id}`);

    profilAbbas.agenceId = agenceKatako._id;
    await profilAbbas.save();

    console.log(`✅ ProfilCommercial mis à jour avec succès !`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ RÉASSIGNATION TERMINÉE");
    console.log("=".repeat(60));
    console.log("Abbas Sako est maintenant lié à 'Agence KATAKO'");
    console.log("Rafraîchissez la page pour voir le changement !");
    console.log("=".repeat(60));

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Erreur lors de la réassignation:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Exécuter la réassignation
reassignCommercial();

