const mongoose = require('mongoose');

const idOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'IdMaker', required: true },
  price: { type: Number, required: true },
  data: {
    idNumber: String,
    pinNumber: String,
    nameBangla: String,
    nameEnglish: String,
    birthDate: String,
    birthPlace: String,
    fatherName: String,
    motherName: String,
    gender: String,
    bloodGroup: String,
    issueDate: String,
    address: String,
    photoFile: String,
    signatureFile: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IdOrder', idOrderSchema);