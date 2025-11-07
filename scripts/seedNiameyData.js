// scripts/seedNiameyData.js
const mongoose = require("mongoose");
const Ville = require("../models/agences/Ville");
const Quartier = require("../models/agences/Quartier");
const Zone = require("../models/agences/Zone");

async function seedNiameyData() {
  try {
    console.log("🌍 Début de la création des données géographiques de Niamey...");

    // 1️⃣ Créer Niamey
    console.log("🏙️ Création de Niamey...");
    const niamey = await Ville.create({
      nom: "Niamey",
      region: "Niamey",
      codePostal: "01",
      description: "Capitale du Niger"
    });
    console.log("✅ Niamey créée:", niamey._id);

    // 2️⃣ Créer les quartiers de Niamey
    console.log("🏘️ Création des quartiers...");
    const quartiers = [
      { nom: "Plateau", description: "Quartier administratif et commercial" },
      { nom: "Gamkalley", description: "Quartier résidentiel" },
      { nom: "Lazaret", description: "Quartier résidentiel" },
      { nom: "Terminus", description: "Quartier commercial" },
      { nom: "Katako", description: "Quartier résidentiel" },
      { nom: "Cité Ouest", description: "Quartier résidentiel" },
      { nom: "Cité Est", description: "Quartier résidentiel" },
      { nom: "Saga", description: "Quartier résidentiel" },
    ];

    const quartiersCreated = [];
    for (const quartierData of quartiers) {
      const quartier = await Quartier.create({
        nom: quartierData.nom,
        ville: niamey._id,
        description: quartierData.description
      });
      quartiersCreated.push(quartier);
      console.log(`✅ Quartier ${quartier.nom} créé`);
    }

    // 3️⃣ Créer les zones pour chaque quartier
    console.log("🏗️ Création des zones...");
    const zonesData = [
      // Plateau
      { quartier: "Plateau", zones: ["Zone Administrative", "Zone Commerciale", "Zone Résidentielle"] },
      // Gamkalley
      { quartier: "Gamkalley", zones: ["Zone A", "Zone B", "Zone C"] },
      // Lazaret
      { quartier: "Lazaret", zones: ["Zone Nord", "Zone Sud", "Zone Centre"] },
      // Terminus
      { quartier: "Terminus", zones: ["Zone Marché", "Zone Transport", "Zone Résidentielle"] },
      // Katako
      { quartier: "Katako", zones: ["Zone 1", "Zone 2", "Zone 3"] },
      // Cité Ouest
      { quartier: "Cité Ouest", zones: ["Zone A", "Zone B", "Zone C"] },
      // Cité Est
      { quartier: "Cité Est", zones: ["Zone A", "Zone B", "Zone C"] },
      // Saga
      { quartier: "Saga", zones: ["Zone Nord", "Zone Sud", "Zone Centre"] },
    ];

    for (const zoneGroup of zonesData) {
      const quartier = quartiersCreated.find(q => q.nom === zoneGroup.quartier);
      if (quartier) {
        for (const zoneNom of zoneGroup.zones) {
          const zone = await Zone.create({
            nom: zoneNom,
            quartier: quartier._id,
            description: `Zone ${zoneNom} du quartier ${quartier.nom}`
          });
          console.log(`✅ Zone ${zone.nom} créée dans ${quartier.nom}`);
        }
      }
    }

    console.log("✅ Données géographiques de Niamey créées avec succès !");
    
    // Vérification finale
    const villesCount = await Ville.countDocuments();
    const quartiersCount = await Quartier.countDocuments();
    const zonesCount = await Zone.countDocuments();
    
    console.log(`📊 Vérification finale:`);
    console.log(`   - Villes: ${villesCount}`);
    console.log(`   - Quartiers: ${quartiersCount}`);
    console.log(`   - Zones: ${zonesCount}`);

  } catch (error) {
    console.error("❌ Erreur lors de la création des données:", error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/geofency")
    .then(() => {
      console.log("🔌 Connecté à MongoDB");
      return seedNiameyData();
    })
    .then(() => {
      console.log("✅ Script terminé");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erreur:", error);
      process.exit(1);
    });
}

module.exports = seedNiameyData;
