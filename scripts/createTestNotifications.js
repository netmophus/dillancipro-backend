require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/agences/Notification');
const User = require('../models/User');

async function createTestNotifications() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer un utilisateur commercial
    const commercial = await User.findOne({ role: 'Commercial' });
    if (!commercial) {
      console.log('❌ Aucun commercial trouvé');
      return;
    }

    console.log(`📝 Commercial trouvé: ${commercial.fullName} (${commercial._id})`);

    // Créer des notifications de test
    const testNotifications = [
      {
        toUser: commercial._id,
        agenceId: commercial._id, // Pour le test
        type: "AFFECTATION_PARCELLE",
        title: "🏡 3 parcelles assignées",
        message: `🏡 3 parcelles vous ont été assignées.\n\n📍 Parcelle A1 (Îlot 1)\n   💰 Prix: 500,000 FCFA\n   📏 Superficie: 400 m²\n\n📍 Parcelle A2 (Îlot 1)\n   💰 Prix: 750,000 FCFA\n   📏 Superficie: 600 m²\n\n📍 Parcelle B1 (Îlot 2)\n   💰 Prix: 1,200,000 FCFA\n   📏 Superficie: 800 m²\n\n✅ Vous pouvez maintenant les consulter et les vendre.`,
        link: "/commercial/parcelles-non-vendues",
        meta: {
          parcelles: [
            { id: "test1", numero: "A1", superficie: 400, prix: 500000, ilot: "Îlot 1" },
            { id: "test2", numero: "A2", superficie: 600, prix: 750000, ilot: "Îlot 1" },
            { id: "test3", numero: "B1", superficie: 800, prix: 1200000, ilot: "Îlot 2" }
          ],
          count: 3,
          totalSuperficie: 1800,
          prixRange: { min: 500000, max: 1200000 }
        }
      },
      {
        toUser: commercial._id,
        agenceId: commercial._id,
        type: "AFFECTATION_BIEN",
        title: "🏠 Villa assignée",
        message: `🏠 Nouveau bien immobilier assigné !\n\n📍 Villa - Villa moderne 4 chambres\n💰 Prix: 15,000,000 FCFA\n📏 Superficie: 250 m²\n🏘️ Localisation: Quartier Plateau\n📝 Description: Magnifique villa moderne avec jardin, garage et piscine. Idéale pour une famille...\n\n✅ Vous pouvez maintenant le consulter et le vendre.`,
        link: "/commercial/mes-biens",
        meta: {
          bien: {
            id: "test_bien_1",
            type: "Villa",
            titre: "Villa moderne 4 chambres",
            prix: 15000000,
            superficie: 250,
            adresse: "Quartier Plateau",
            agence: "Agence KATAKO"
          }
        }
      },
      {
        toUser: commercial._id,
        agenceId: commercial._id,
        type: "AFFECTATION_PARCELLE",
        title: "🏡 1 parcelle assignée",
        message: `🏡 1 parcelle vous a été assignée.\n\n📍 Parcelle C1 (Îlot 3)\n   💰 Prix: 2,500,000 FCFA\n   📏 Superficie: 1000 m²\n\n✅ Vous pouvez maintenant la consulter et la vendre.`,
        link: "/commercial/parcelles-non-vendues",
        meta: {
          parcelles: [
            { id: "test4", numero: "C1", superficie: 1000, prix: 2500000, ilot: "Îlot 3" }
          ],
          count: 1,
          totalSuperficie: 1000,
          prixRange: { min: 2500000, max: 2500000 }
        }
      }
    ];

    // Supprimer les anciennes notifications de test
    await Notification.deleteMany({ toUser: commercial._id });
    console.log('🗑️ Anciennes notifications supprimées');

    // Créer les nouvelles notifications
    for (const notification of testNotifications) {
      await Notification.create(notification);
    }

    console.log('✅ Notifications de test créées avec succès !');
    console.log(`📊 ${testNotifications.length} notifications créées pour ${commercial.fullName}`);

  } catch (error) {
    console.error('❌ Erreur lors de la création des notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

createTestNotifications();
