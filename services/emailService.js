const nodemailer = require("nodemailer");
require("dotenv").config();

// Configuration du transporteur email
const createTransporter = () => {
  // Recharger dotenv pour s'assurer que les variables sont à jour
  require("dotenv").config({ override: false });
  
  // Support pour plusieurs types de services email
  const emailService = process.env.EMAIL_SERVICE || "gmail";
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT || 587;
  const emailSecure = process.env.EMAIL_SECURE === "true";
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  // Debug: Afficher toutes les variables email pour diagnostiquer
  console.log("🔍 [EMAIL] Variables d'environnement chargées:");
  console.log("  - EMAIL_SERVICE:", emailService);
  console.log("  - EMAIL_HOST:", emailHost || "non défini");
  console.log("  - EMAIL_PORT:", emailPort);
  console.log("  - EMAIL_USER:", emailUser ? `${emailUser.substring(0, 3)}***` : "❌ non défini");
  console.log("  - EMAIL_PASSWORD:", emailPassword ? "✅ défini" : "❌ non défini");
  console.log("  - EMAIL_FROM:", process.env.EMAIL_FROM || "non défini");

  // Si les variables d'environnement ne sont pas définies, retourner null pour gérer l'erreur
  if (!emailUser || !emailPassword) {
    console.warn("⚠️ [EMAIL] Variables d'environnement email non définies.");
    console.warn("⚠️ [EMAIL] EMAIL_USER:", emailUser ? "✅" : "❌");
    console.warn("⚠️ [EMAIL] EMAIL_PASSWORD:", emailPassword ? "✅" : "❌");
    console.warn("⚠️ [EMAIL] Vérifiez que le fichier .env est dans le répertoire geofencybackend/");
    console.warn("⚠️ [EMAIL] Et que le serveur a été redémarré après l'ajout des variables.");
    // Retourner null pour que l'appelant puisse gérer l'erreur
    return null;
  }

  // Configuration pour Gmail, Outlook, etc.
  if (emailService === "gmail" || emailService === "outlook") {
    return nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }

  // Configuration SMTP personnalisée
  return nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort),
    secure: emailSecure,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

/**
 * Envoyer un email
 * @param {string} to - Adresse email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} html - Contenu HTML de l'email
 * @param {string} text - Contenu texte alternatif (optionnel)
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
const sendEmail = async (to, subject, html, text = null) => {
  try {
    console.log(`📧 [EMAIL] Tentative d'envoi email à: ${to}`);
    
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error("❌ [EMAIL] Transporteur email non disponible. Veuillez configurer les variables d'environnement EMAIL_USER et EMAIL_PASSWORD.");
      return {
        success: false,
        error: "Service email non configuré. Veuillez contacter l'administrateur.",
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@geofoncier.com",
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Extraire le texte du HTML si text n'est pas fourni
    };

    console.log(`📧 [EMAIL] Sujet: ${subject}`);
    console.log(`📧 [EMAIL] De: ${mailOptions.from}`);

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ [EMAIL] Email envoyé avec succès: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ [EMAIL] Erreur lors de l'envoi de l'email:", error);
    console.error("❌ [EMAIL] Stack:", error.stack);
    return {
      success: false,
      error: error.message || "Erreur lors de l'envoi de l'email",
    };
  }
};

/**
 * Envoyer un code de réinitialisation de mot de passe par email
 * @param {string} to - Adresse email du destinataire
 * @param {string} code - Code de réinitialisation à 6 chiffres
 * @param {string} fullName - Nom complet de l'utilisateur (optionnel)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendPasswordResetCode = async (to, code, fullName = "Utilisateur") => {
  const subject = "Code de réinitialisation de mot de passe - GeoFoncier";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          border: 1px solid #ddd;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .code-box {
          background-color: #ffffff;
          border: 2px dashed #2563eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .code {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          letter-spacing: 5px;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">GeoFoncier</div>
        </div>
        
        <h2>Bonjour ${fullName},</h2>
        
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code suivant pour continuer :</p>
        
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        
        <div class="warning">
          <strong>⚠️ Important :</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Ce code expire dans <strong>10 minutes</strong></li>
            <li>Ne partagez jamais ce code avec qui que ce soit</li>
            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
          </ul>
        </div>
        
        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GeoFoncier. Tous droits réservés.</p>
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

/**
 * Envoyer un code de vérification OTP pour l'activation de compte par email
 * @param {string} to - Adresse email du destinataire
 * @param {string} code - Code de vérification à 6 chiffres
 * @param {string} fullName - Nom complet de l'utilisateur (optionnel)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendVerificationCode = async (to, code, fullName = "Utilisateur") => {
  const subject = "Code de vérification - Activation de votre compte GeoFoncier";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          border: 1px solid #ddd;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .code-box {
          background-color: #ffffff;
          border: 2px dashed #2563eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .code {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          letter-spacing: 5px;
        }
        .info {
          background-color: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">GeoFoncier</div>
        </div>
        
        <h2>Bienvenue ${fullName} !</h2>
        
        <p>Merci de vous être inscrit sur GeoFoncier. Pour activer votre compte, veuillez utiliser le code de vérification suivant :</p>
        
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        
        <div class="info">
          <strong>ℹ️ Information :</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Ce code expire dans <strong>15 minutes</strong></li>
            <li>Ne partagez jamais ce code avec qui que ce soit</li>
            <li>Si vous n'avez pas créé de compte, ignorez cet email</li>
          </ul>
        </div>
        
        <p>Une fois votre compte activé, vous pourrez accéder à tous les services de GeoFoncier.</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GeoFoncier. Tous droits réservés.</p>
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendPasswordResetCode,
  sendVerificationCode,
};

