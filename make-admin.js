require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    const result = await User.findOneAndUpdate(
      { email: 'junaedfko@gmail.com' },
      { $set: { isActive: true, role: 'admin' } },
      { new: true }
    );

    if (result) {
      console.log('🎉 সফল! ইউজার এখন অ্যাডমিন:');
      console.log('   নাম:', result.name);
      console.log('   ইমেইল:', result.email);
      console.log('   Role:', result.role);
      console.log('   isActive:', result.isActive);
    } else {
      console.log('⚠️ এই ইমেইলে কোনো ইউজার পাওয়া যায়নি!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ এরর:', e.message);
    process.exit(1);
  }
}

makeAdmin();