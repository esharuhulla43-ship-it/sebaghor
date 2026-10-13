const mongoose = require('mongoose');

const idMakerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  templateImage: { type: String, required: true },
  price: { type: Number, required: true },
  active: { type: Boolean, default: true },
  
  // পজিশন সেটিং (% এ)
  positions: {
    photo:    { x: { type: Number, default: 4 },  y: { type: Number, default: 30 }, w: { type: Number, default: 16 }, h: { type: Number, default: 40 } },
    nameBangla:  { x: { type: Number, default: 22 }, y: { type: Number, default: 32 } },
    nameEnglish: { x: { type: Number, default: 22 }, y: { type: Number, default: 40 } },
    father:   { x: { type: Number, default: 22 }, y: { type: Number, default: 48 } },
    mother:   { x: { type: Number, default: 22 }, y: { type: Number, default: 56 } },
    birthDate:{ x: { type: Number, default: 22 }, y: { type: Number, default: 64 } },
    idNumber: { x: { type: Number, default: 22 }, y: { type: Number, default: 73 } },
    address:  { x: { type: Number, default: 55 }, y: { type: Number, default: 24 } },
    blood:    { x: { type: Number, default: 60 }, y: { type: Number, default: 58 } },
    birthPlace:{ x: { type: Number, default: 82 }, y: { type: Number, default: 58 } },
    issueDate:{ x: { type: Number, default: 82 }, y: { type: Number, default: 72 } },
    signature:{ x: { type: Number, default: 8 },  y: { type: Number, default: 74 }, w: { type: Number, default: 14 }, h: { type: Number, default: 12 } }
  },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IdMaker', idMakerSchema);