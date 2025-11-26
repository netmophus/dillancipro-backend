const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userProfileRoutes = require("./routes/userProfileRoutes");

const villeRoutes = require("./routes/agences/villeRoutes");
const quartierRoutes = require("./routes/agences/quartierRoutes");
const zoneRoutes = require("./routes/agences/zoneRoutes");
const ilotRoutes = require("./routes/agences/ilotRoutes");
const parcelleRoutes = require("./routes/agences/parcelleRoutes");
const commercialRoutes = require("./routes/agences/commercialRoutes");
const paiementRoutes = require("./routes/agences/paiementRoutes");
const adminRoutes = require("./routes/adminRoutes");
const profilCommercialRoutes = require("./routes/agences/profilCommercialRoutes");
const notificationRoutes = require("./routes/agences/notificationRoutes");
const agenceStatsRoutes = require("./routes/agences/agenceStatsRoutes");
const bienRoutes = require("./routes/agences/bienRoutes");
const commercialBienRoutes = require("./routes/commercial/bienRoutes");
const venteBienRoutes = require("./routes/agences/venteBienRoutes");
const agenceNotaireRoutes = require("./routes/agences/notaireRoutes");
const locationRoutes = require("./routes/agences/locationRoutes");
const clientRoutes = require("./routes/agences/clientRoutes");
const clientDashboardRoutes = require("./routes/clientRoutes");
const echeancierRoutes = require("./routes/agences/echeancierRoutes");
const patrimoineRoutes = require("./routes/patrimoineRoutes");
const tarifRoutes = require("./routes/admin/tarifRoutes");
const verificationRoutes = require("./routes/admin/verificationRoutes");
const gestionAbonnementRoutes = require("./routes/admin/gestionAbonnementRoutes");
const notaireRoutes = require("./routes/admin/notaireRoutes");
const paiementPatrimoineRoutes = require("./routes/paiementPatrimoineRoutes");
const ventePatrimoineRoutes = require("./routes/ventePatrimoineRoutes");
const { uploadGeneric } = require("./middlewares/uploadGeneric");
const uploadIHEMedia = require("./middlewares/uploadIHEMedia");

dotenv.config();

console.log("[Cloudinary env]",
  {
    name:   process.env.CLOUDINARY_CLOUD_NAME ? "OK" : "MISSING",
    key:    process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
    secret: process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING",
  }
);

const app = express();


// ✅ Origines autorisées
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.80.198:3000",
   "http://192.168.0.100:3000",
  "https://dillanciprofrontend-94260dd67ad1.herokuapp.com",
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(
    ...process.env.ALLOWED_ORIGINS.split(",")
      .map((url) => url.trim())
      .filter(Boolean)
  );
}

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

console.log("[CORS] Allowed origins:", uniqueAllowedOrigins);


// ✅ Middleware CORS dynamique
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || uniqueAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("[CORS] Origin non autorisée:", origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    optionsSuccessStatus: 200,
  })
);


app.use(express.json());


const multer = require("multer");
const upload = multer(); // pour lire les champs simples

// server.js / app.js
app.use("/uploads", express.static("uploads"));


// Routes
app.use("/api/auth", authRoutes);   // Routes liées à User (connexion, statut, tracking)
app.use("/api/user", userProfileRoutes);


app.use("/api/admin", adminRoutes);


app.use("/api/agence/villes", villeRoutes);
app.use("/api/agence/quartiers", quartierRoutes);
app.use("/api/agence/zones", zoneRoutes);
app.use("/api/agence/ilots", ilotRoutes);
app.use("/api/agence/parcelles", parcelleRoutes);
app.use("/api/agence/notaires", agenceNotaireRoutes);



// ...
app.use("/api/agence/commerciaux", commercialRoutes);


app.use("/api/agence/paiements", paiementRoutes);

app.use("/api/agence/echeanciers", echeancierRoutes);

app.use("/api/agence/commerciaux", profilCommercialRoutes);

app.use("/api/agence", agenceStatsRoutes);

app.use("/api/agence/biens", bienRoutes);

app.use("/api/agence/ventes", venteBienRoutes);

app.use("/api/agence/locations", locationRoutes);

app.use("/api/commercial/biens", commercialBienRoutes);

app.use("/api/agence/notifications", notificationRoutes);

app.use("/api/agence/clients", clientRoutes);

app.use("/api/client", clientDashboardRoutes);

app.use("/api/client/patrimoine", patrimoineRoutes);

// Routes IHE (Immobilisations Hors Exploitation) pour les banques
const banqueIHERoutes = require("./routes/banque/banqueIHERoutes");
app.use("/api/banque/ihe", banqueIHERoutes);

// Routes demandes de crédit hypothécaire pour les banques
const demandeCreditHypothecaireRoutes = require("./routes/banque/demandeCreditHypothecaireRoutes");
app.use("/api/banque/demandes-credit-hypothecaire", demandeCreditHypothecaireRoutes);

// Routes tarification (admin)
app.use("/api/admin/tarifs", tarifRoutes);

// Routes vérification (admin)
app.use("/api/admin/patrimoine/verifications", verificationRoutes);

// Routes gestion abonnements (admin)
app.use("/api/admin/patrimoine/abonnements", gestionAbonnementRoutes);
app.use("/api/admin/notaires", notaireRoutes);

// Routes notaire
const notaireVenteRoutes = require("./routes/notaire/venteRoutes");
app.use("/api/notaire/ventes", notaireVenteRoutes);

// Routes demandes de crédit hypothécaire pour les notaires
const demandeCreditHypothecaireNotaireRoutes = require("./routes/notaire/demandeCreditHypothecaireRoutes");
app.use("/api/notaire/demandes-credit-hypothecaire", demandeCreditHypothecaireNotaireRoutes);

// Routes paiements patrimoine
app.use("/api/patrimoine/paiements", paiementPatrimoineRoutes);

// Routes ventes patrimoine
app.use("/api/patrimoine/ventes", ventePatrimoineRoutes);

// Route publique pour les biens immobiliers (homepage)
const { getPublicPatrimoine } = require("./controllers/patrimoineController");
app.get("/api/public/patrimoine", getPublicPatrimoine);

// Route publique pour les parcelles à vendre (homepage)
const { getPublicParcelles } = require("./controllers/agences/parcelleController");
app.get("/api/public/parcelles", getPublicParcelles);

// Routes publiques pour la recherche de parcelles avec filtres
const parcellePublicRoutes = require("./routes/public/parcellePublicRoutes");
app.use("/api/public/parcelles", parcellePublicRoutes);

// Routes publiques pour la recherche de locations avec filtres
const locationPublicRoutes = require("./routes/public/locationPublicRoutes");
app.use("/api/public/locations", locationPublicRoutes);

// Routes publiques pour les biens immobiliers
const bienPublicRoutes = require("./routes/public/bienPublicRoutes");
app.use("/api/public/biens", bienPublicRoutes);

// Route d'upload générique
// Route générique d'upload (pour compatibilité)
app.post("/api/upload", uploadGeneric[0], uploadGeneric[1], (req, res) => {
  if (req.cloudinary) {
    res.status(200).json({
      message: "✅ Fichier uploadé avec succès",
      url: req.cloudinary.url,
      public_id: req.cloudinary.public_id,
    });
  } else {
    res.status(400).json({ message: "Aucun fichier uploadé" });
  }
});

// Route spécifique pour uploader les médias IHE (photos et documents)
// POST /api/banque/ihe/upload-media
// Body: { file: File, mediaType: 'photo' | 'document', iheId?: string }
// Requiert authentification
const authMiddleware = require("./middlewares/authMiddleware");
app.post("/api/banque/ihe/upload-media", authMiddleware, uploadIHEMedia[0], uploadIHEMedia[1], (req, res) => {
  try {
    if (!req.cloudinary || !req.cloudinary.iheMedia) {
      return res.status(400).json({
        message: "Aucun fichier uploadé",
      });
    }

    const { iheMedia } = req.cloudinary;

    res.status(200).json({
      message: "✅ Fichier uploadé avec succès",
      url: iheMedia.url,
      public_id: iheMedia.public_id,
      resource_type: iheMedia.resource_type,
      folder: iheMedia.folder,
      originalName: iheMedia.originalName,
      size: iheMedia.size,
    });
  } catch (error) {
    console.error("❌ Erreur route upload-media:", error);
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

app.use("/api", notificationRoutes);


// Route de test
app.get("/", (req, res) => {
  res.send("🚀 Serveur backend opérationnel !");
});

// Connexion MongoDB + démarrage serveur
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connexion MongoDB réussie");
    
    // Initialiser les tarifs par défaut
    const { initTarifsDefaut } = require("./controllers/admin/tarifController");
    await initTarifsDefaut();
    
    // Démarrer les cron jobs
    const { checkExpiration, relanceAvantExpiration } = require("./cron/checkExpiration");
    checkExpiration();
    relanceAvantExpiration();
    
    // Démarrer les cron jobs pour les alertes réglementaires IHE
    const { checkIHEAlertesReglementaires, rapportHebdomadaireIHE } = require("./cron/checkIHEAlertes");
    checkIHEAlertesReglementaires();
    rapportHebdomadaireIHE();
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erreur de connexion MongoDB :", err.message);
  });
