// exports.authorizeRoles = (...roles) => {
//     return (req, res, next) => {
//       if (!roles.includes(req.user.role)) {
//         return res.status(403).json({ message: "Accès interdit" });
//       }
//       next();
//     };
//   };
  




const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log("🔍 [AUTHORIZE_ROLES] User:", req.user);
    console.log("🔍 [AUTHORIZE_ROLES] Roles autorisés:", roles);
    
    if (!req.user || !req.user.role) {
      console.log("❌ [AUTHORIZE_ROLES] Utilisateur non authentifié");
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Normaliser le rôle (peut être une string ou un objet)
    const userRole = typeof req.user.role === 'string' ? req.user.role : req.user.role?.name || '';
    console.log("🔍 [AUTHORIZE_ROLES] Rôle utilisateur:", userRole);

    // Vérifier si le rôle est autorisé (comparaison insensible à la casse)
    const roleAuthorized = roles.some(role => 
      userRole.toLowerCase() === role.toLowerCase()
    );

    if (!roleAuthorized) {
      console.log("❌ [AUTHORIZE_ROLES] Accès refusé pour le rôle:", userRole);
      return res.status(403).json({ 
        message: `Accès interdit. Rôle requis: ${roles.join(', ')}. Votre rôle: ${userRole}` 
      });
    }

    console.log("✅ [AUTHORIZE_ROLES] Accès autorisé");
    next();
  };
};

module.exports = { authorizeRoles };
