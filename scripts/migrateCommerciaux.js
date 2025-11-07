// scripts/migrateCommerciaux.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Agence = require("../models/Agence");
const ProfilCommercial = require("../models/agences/ProfilCommercial");

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/geofoncier";

async function migrateCommerciaux() {
  try {
    console.log("🔄 Connexion à MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connecté à MongoDB");

    // 1. Récupérer tous les commerciaux
    const commerciaux = await User.find({ role: "Commercial" });
    console.log(`📝 ${commerciaux.length} commerciaux trouvés`);

    // 2. Pour chaque commercial, vérifier s'il a un ProfilCommercial
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const commercial of commerciaux) {
      console.log(`\n🔍 Traitement: ${commercial.fullName || commercial.phone}`);

      // Vérifier si ProfilCommercial existe déjà
      const existingProfil = await ProfilCommercial.findOne({ userId: commercial._id });
      
      if (existingProfil) {
        console.log(`  ⏭️  ProfilCommercial existe déjà (agenceId: ${existingProfil.agenceId})`);
        skipped++;
        continue;
      }

      // Demander à quelle agence appartient ce commercial
      // Pour l'instant, on va le lier à la première agence trouvée
      // Vous pouvez modifier cette logique selon vos besoins
      const agences = await Agence.find();
      
      if (agences.length === 0) {
        console.log(`  ❌ Aucune agence trouvée dans le système`);
        errors++;
        continue;
      }

      // Si vous n'avez qu'une seule agence, on l'utilise
      // Sinon, vous pouvez ajouter une logique pour choisir l'agence
      const agence = agences[0];
      
      console.log(`  📌 Association avec l'agence: ${agence.nom} (${agence._id})`);

      // Créer le ProfilCommercial
      try {
        const profilCommercial = await ProfilCommercial.create({
          userId: commercial._id,
          agenceId: agence._id,
          fullName: commercial.fullName || "",
          commission: {
            mode: "pourcentage",
            valeur: 0,
            devise: "XOF",
            actif: true,
          },
        });

        console.log(`  ✅ ProfilCommercial créé: ${profilCommercial._id}`);
        created++;
      } catch (error) {
        console.log(`  ❌ Erreur création ProfilCommercial:`, error.message);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 RÉSUMÉ DE LA MIGRATION");
    console.log("=".repeat(60));
    console.log(`✅ ProfilCommercial créés: ${created}`);
    console.log(`⏭️  Déjà existants: ${skipped}`);
    console.log(`❌ Erreurs: ${errors}`);
    console.log(`📝 Total traité: ${commerciaux.length}`);
    console.log("=".repeat(60));

    await mongoose.connection.close();
    console.log("\n✅ Migration terminée !");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Erreur lors de la migration:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Exécuter la migration
migrateCommerciaux();

