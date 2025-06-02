const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  userId: { type: String, require: true, unique: true },
  serverId: { type: String, require: true },
  balance: { type: Number, default: 0 },
  dailyLastUsed: { type: Number, default: 0 },
  coinflipLastUsed: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastClaimDate: { type: Date, default: 0 },
  inventory: { type: [String], default: [] },
});

const model = mongoose.model("bankdb", profileSchema);

module.exports = model;
