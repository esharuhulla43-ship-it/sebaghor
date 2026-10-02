const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },  // নতুন
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },  // পুরোনো সিস্টেম
  selectedOption: { type: String, default: '' },  // নতুন — কোন অপশন
  selectedPrice: { type: Number, default: 0 },    // নতুন — সেই অপশনের দাম
  details: { type: String, default: '' },         // নতুন — ইউজারের লেখা বিস্তারিত
  price: Number,
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  adminPdf: String,
  adminImage: String,
  adminText: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);