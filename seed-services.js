require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('./models/Service');

const servicesData = [
  { name: 'সাইনকপি', category: 'সাইনকপি', icon: '✍️', description: 'স্বাক্ষর কপি তৈরি করুন সহজেই', price: 100 },
  { name: 'সার্ভার কপি অর্ডার', category: 'সাইনকপি', icon: '📋', description: 'সার্ভার কপি অর্ডার করুন', price: 150 },
  { name: 'আইডি কার্ড PDF', category: 'এনআইডি', icon: '🪪', description: 'আইডি কার্ড পিডিএফ ফরম্যাটে অর্ডার', price: 100 },
  { name: 'সিমের অর্ডার সার্ভিস', category: 'সিম', icon: '📱', description: 'নতুন সিম অর্ডার করুন', price: 250 },
  { name: 'সিমের বায়োমেট্রিক', category: 'সিম', icon: '👆', description: 'সিমের বায়োমেট্রিক সেবা', price: 200 },
  { name: 'সিমের লোকেশন', category: 'সিম', icon: '📍', description: 'সিমের লোকেশন ট্র্যাক করুন', price: 350 },
  { name: 'সিমের কল লিস্ট', category: 'সিম', icon: '📞', description: 'কল লিস্ট বের করুন', price: 300 },
  { name: 'সিমের মেসেজ লিস্ট', category: 'সিম', icon: '💬', description: 'মেসেজ লিস্ট বের করুন', price: 300 },
  { name: 'Nid নং থেকে সব সিম', category: 'এনআইডি', icon: '🆔', description: 'এনআইডি দিয়ে সব সিম বের করুন', price: 400 },
  { name: 'imei দিয়ে মোবাইলের তথ্য', category: 'মোবাইল', icon: '📲', description: 'IMEI দিয়ে মোবাইলের তথ্য', price: 500 },
  { name: 'একাউন্টের বায়োমেট্রিক', category: 'একাউন্ট', icon: '🔐', description: 'একাউন্টের বায়োমেট্রিক সেবা', price: 250 },
  { name: 'একাউন্টের লেনদেন তথ্য', category: 'একাউন্ট', icon: '💳', description: 'একাউন্টের লেনদেন তথ্য', price: 350 },
  { name: 'হারানো এনআইডি কার্ড', category: 'এনআইডি', icon: '🔍', description: 'হারানো এনআইডি কার্ড পুনরায়', price: 250 },
  { name: 'T টেক্সট অর্ডার', category: 'টেক্সট', icon: '📄', description: 'টেক্সট সেবা অর্ডার করুন', price: 150 },
  { name: 'মোবাইল ফ্লেস সকল টুলস', category: 'মোবাইল', icon: '🔧', description: 'মোবাইল ফ্লাসের সকল টুলস', price: 600 }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    let added = 0;
    let skipped = 0;

    for (const item of servicesData) {
      const exists = await Service.findOne({ name: item.name });
      if (exists) {
        console.log(`⏭️  আছে: ${item.name}`);
        skipped++;
      } else {
        await Service.create({
          name: item.name,
          category: item.category,
          icon: item.icon,
          description: item.description,
          options: [{ label: 'স্ট্যান্ডার্ড', price: item.price }]
        });
        console.log(`✅ যোগ হয়েছে: ${item.name}`);
        added++;
      }
    }

    console.log('\n🎉 সম্পন্ন!');
    console.log(`   যোগ হয়েছে: ${added}`);
    console.log(`   আগেই ছিল: ${skipped}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ এরর:', e.message);
    process.exit(1);
  }
}

seed();