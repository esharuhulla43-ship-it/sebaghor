const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  selectedOption: { type: String, default: '' },
  selectedPrice: { type: Number, default: 0 },
  details: { type: String, default: '' },
  price: Number,
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  
  adminPdfData: String,
  adminPdfName: String,
  adminImageData: String,
  adminImageName: String,
  adminText: String,
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);