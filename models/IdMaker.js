const mongoose = require('mongoose');

const idMakerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  templateImage: { type: String, required: true },
  price: { type: Number, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IdMaker', idMakerSchema);