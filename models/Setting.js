const mongoose = require('mongoose');
const settingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'SEBA GHOR' },
  tagline: { type: String, default: 'সেবাই আমাদের শক্তি, আপনার পাশে সবসময়' },
  bkashNumber: String,
  nagadNumber: String,
  paymentNumber: String,
  whatsappSupport: String,
  whatsappAdmin: String,
  marqueeText: { type: String, default: '' }
});
module.exports = mongoose.model('Setting', settingSchema);