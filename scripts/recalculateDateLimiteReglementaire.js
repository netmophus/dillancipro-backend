/**
 * Script pour recalculer dateLimiteReglementaire (24 mois BCEAO) 
 * pour les IHE existantes qui n'ont pas cette date calculée
 * 
 * Usage: node scripts/recalculateDateLimiteReglementaire.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Importer le modèle IHE
const IHE = require("../models/banque/IHE");

const recalculateDateLimiteReglementaire = async () => {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/geofoncier";
    await mongoose.connect(mongoUri);
    console.log("✅ Connexion MongoDB réussie");

    // Trouver toutes les IHE avec typeReglementaireIHE = "reprise_garantie" 
    // qui n'ont pas de dateLimiteReglementaire
    const ihes = await IHE.find({
      typeReglementaireIHE: "reprise_garantie",
      $or: [
        { dateLimiteReglementaire: { $exists: false } },
        { dateLimiteReglementaire: null },
      ],
    });

    console.log(`📊 ${ihes.length} IHE trouvées sans dateLimiteReglementaire`);

    let updated = 0;
    let skipped = 0;

    for (const ihe of ihes) {
      // Utiliser dateEntreeIHEReglementaire ou dateEntreeIHE
      const dateEntree = ihe.dateEntreeIHEReglementaire || ihe.dateEntreeIHE;

      if (!dateEntree) {
        console.log(`⚠️ IHE ${ihe.reference} (${ihe._id}) : Pas de date d'entrée disponible`);
        skipped++;
        continue;
      }

      // Calculer dateLimiteReglementaire = dateEntree + 24 mois
      const dateEntreeObj = new Date(dateEntree);
      const dateLimiteReglementaire = new Date(dateEntreeObj);
      dateLimiteReglementaire.setMonth(dateLimiteReglementaire.getMonth() + 24);

      // Mettre à jour l'IHE
      ihe.dateLimiteReglementaire = dateLimiteReglementaire;
      await ihe.save();

      console.log(
        `✅ IHE ${ihe.reference} : dateLimiteReglementaire calculée = ${dateLimiteReglementaire.toLocaleDateString("fr-FR")}`
      );
      updated++;
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   - IHE mises à jour: ${updated}`);
    console.log(`   - IHE ignorées (pas de date d'entrée): ${skipped}`);
    console.log(`   - Total: ${ihes.length}`);

    // Aussi mettre à jour les IHE qui ont dateLimiteReglementaire mais qui pourraient avoir besoin d'un recalcul
    // si leur date d'entrée a changé
    const ihesAvecDateLimite = await IHE.find({
      typeReglementaireIHE: "reprise_garantie",
      dateLimiteReglementaire: { $exists: true, $ne: null },
    });

    let recalculated = 0;
    for (const ihe of ihesAvecDateLimite) {
      const dateEntree = ihe.dateEntreeIHEReglementaire || ihe.dateEntreeIHE;
      if (dateEntree) {
        const dateEntreeObj = new Date(dateEntree);
        const dateLimiteAttendue = new Date(dateEntreeObj);
        dateLimiteAttendue.setMonth(dateLimiteAttendue.getMonth() + 24);

        // Vérifier si la date limite actuelle correspond à la date attendue (à 1 jour près)
        const diffJours = Math.abs(
          (dateLimiteAttendue - new Date(ihe.dateLimiteReglementaire)) / (1000 * 60 * 60 * 24)
        );

        if (diffJours > 1) {
          // La date limite ne correspond pas, recalculer
          ihe.dateLimiteReglementaire = dateLimiteAttendue;
          await ihe.save();
          console.log(
            `🔄 IHE ${ihe.reference} : dateLimiteReglementaire recalculée = ${dateLimiteAttendue.toLocaleDateString("fr-FR")}`
          );
          recalculated++;
        }
      }
    }

    if (recalculated > 0) {
      console.log(`\n🔄 ${recalculated} IHE avec dateLimiteReglementaire recalculée`);
    }

    console.log("\n✅ Script terminé avec succès");
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Déconnexion MongoDB");
  }
};

// Exécuter le script
if (require.main === module) {
  recalculateDateLimiteReglementaire();
}

module.exports = recalculateDateLimiteReglementaire;

