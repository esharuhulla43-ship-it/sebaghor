const mongoose = require('mongoose');

const trxSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['bKash', 'Nagad'], required: true },
  senderNumber: { type: String, required: true },
  transactionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'approved'], default: 'approved' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', trxSchema);