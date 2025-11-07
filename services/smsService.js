const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const SMS_API_URL = process.env.SMS_API_URL;
const SMS_USERNAME = process.env.SMS_USERNAME;
const SMS_PASSWORD = process.env.SMS_PASSWORD;

const sendSMS = async (to, message) => {
  try {
    // Vérifier que les variables d'environnement sont définies
    if (!SMS_API_URL || !SMS_USERNAME || !SMS_PASSWORD) {
      console.error("❌ [SMS] Variables d'environnement manquantes :", {
        SMS_API_URL: SMS_API_URL ? "✅" : "❌",
        SMS_USERNAME: SMS_USERNAME ? "✅" : "❌",
        SMS_PASSWORD: SMS_PASSWORD ? "✅" : "❌",
      });
      return { 
        success: false, 
        error: "Configuration SMS manquante. Veuillez vérifier les variables d'environnement." 
      };
    }

    // Vérifier que l'URL est valide
    if (!SMS_API_URL.startsWith("http://") && !SMS_API_URL.startsWith("https://")) {
      console.error("❌ [SMS] URL invalide :", SMS_API_URL);
      return { 
        success: false, 
        error: "URL SMS invalide. L'URL doit commencer par http:// ou https://" 
      };
    }

    const payload = {
      to,
      from: "Softlink",
      content: message,
      dlr: "yes",
      "dlr-level": 3,
      "dlr-method": "GET",
      "dlr-url": "https://sms.ne/dlr",
    };

    console.log("📱 [SMS] Envoi SMS à:", to);
    console.log("📱 [SMS] URL:", SMS_API_URL);

    const response = await axios.post(SMS_API_URL, payload, {
      auth: {
        username: SMS_USERNAME,
        password: SMS_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000, // 10 secondes de timeout
    });

    console.log("✅ [SMS] SMS envoyé avec succès :", response.data);
    return response.status === 200
      ? { success: true, data: response.data }
      : { success: false, data: response.data };
  } catch (error) {
    if (error.response) {
      console.error("❌ [SMS] Erreur de l'API SMS :", error.response.status, error.response.data);
      return { 
        success: false, 
        error: error.response.data || "Erreur lors de l'envoi du SMS" 
      };
    } else if (error.request) {
      console.error("❌ [SMS] Aucune réponse du serveur SMS :", error.message);
      return { 
        success: false, 
        error: "Impossible de contacter le serveur SMS. Vérifiez votre connexion." 
      };
    } else {
      console.error("❌ [SMS] Erreur de configuration :", error.message);
      return { 
        success: false, 
        error: `Erreur de configuration : ${error.message}` 
      };
    }
  }
};

module.exports = { sendSMS };

