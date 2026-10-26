const mongoose = require('mongoose');
const settingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'SEBA GHOR' },
  tagline: { type: String, default: 'সেবাই আমাদের শক্তি, আপনার পাশে সবসময়' },
  bkashNumber: String,
  nagadNumber: String,
  paymentNumber: String,
  whatsappSupport: String,
  whatsappAdmin: String,
  marqueeText: { type: String, default: '' },
  
  // 🆕 রিসিভ সেটিংস (নতুন যা যোগ হলো)
  shopName: { type: String, default: 'আমার দোকান' },
  shopMobile: { type: String, default: '01700000000' },
  lastReceiptYear: { type: Number, default: 0 },
  lastReceiptCounter: { type: Number, default: 0 }
});
module.exports = mongoose.model('Setting', settingSchema);