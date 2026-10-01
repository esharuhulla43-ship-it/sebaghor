const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '📄' },
  color: { type: String, default: '#2563eb' },
  price: { type: Number, required: true },
  subtitle: { type: String, default: '' },
  big: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);