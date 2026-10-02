const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },          // সার্ভিসের নাম (যেমন: এনআইডি সার্ভিস)
  category: { type: String, required: true },      // ক্যাটাগরি (যেমন: এনআইডি, সিম)
  description: { type: String, default: '' },      // বর্ণনা
  options: [{
    label: { type: String, required: true },       // যেমন: "ফর্ম/ফোটার নং দিয়ে"
    price: { type: Number, required: true }        // যেমন: 350
  }],
  active: { type: Boolean, default: true },        // অন/অফ
  sortOrder: { type: Number, default: 0 },         // সাজানোর জন্য
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);