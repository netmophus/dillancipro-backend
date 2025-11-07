const mongoose = require("mongoose");

const UserSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ipAddress: { type: String },
  device: { type: String },
  loginTime: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  logoutTime: { type: Date },
  status: { type: String, enum: ["active", "terminated"], default: "active" },
});

module.exports = mongoose.model("UserSession", UserSessionSchema);
