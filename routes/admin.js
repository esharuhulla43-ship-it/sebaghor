const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Notice = require('../models/Notice');
const Setting = require('../models/Setting');
const Transaction = require('../models/Transaction');
const Service = require('../models/Service');
const { isAdmin } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, f, cb) => cb(null, Date.now() + '-' + f.originalname)
});
const upload = multer({ storage });

router.get('/dashboard', isAdmin, async (req, res) => {
  const users = await User.find({ role: 'user' }).sort('-createdAt');
  const products = await Product.find().sort('-createdAt');
  const services = await Service.find().sort('-createdAt');
  const orders = await Order.find().populate('user product').sort('-createdAt');
  const setting = await Setting.findOne() || {};
  res.render('admin/dashboard', { users, products, orders, services, setting });
});


router.post('/users/toggle/:id', isAdmin, async (req, res) => {
  const u = await User.findById(req.params.id);
  u.isActive = !u.isActive;
  await u.save();
  req.flash('success', u.isActive ? '✅ আইডি একটিভ করা হয়েছে' : '❌ আইডি ডিএকটিভ করা হয়েছে');
  res.redirect('/admin/dashboard#users');
});

router.post('/users/delete/:id', isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  req.flash('success', '🗑️ ইউজার ডিলিট হয়েছে');
  res.redirect('/admin/dashboard#users');
});

router.post('/products/add', isAdmin, async (req, res) => {
  const { name, price, icon, color, subtitle, big } = req.body;
  await Product.create({
    name, price: Number(price),
    icon: icon || '📄', color: color || '#2563eb',
    subtitle: subtitle || '', big: big === 'on'
  });
  req.flash('success', '✅ প্রোডাক্ট যোগ হয়েছে');
  res.redirect('/admin/dashboard#products');
});

router.post('/products/edit/:id', isAdmin, async (req, res) => {
  const { name, price, icon, color, subtitle } = req.body;
  await Product.findByIdAndUpdate(req.params.id, {
    name, price: Number(price), icon, color, subtitle
  });
  req.flash('success', '✅ আপডেট হয়েছে');
  res.redirect('/admin/dashboard#products');
});

router.post('/products/delete/:id', isAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  req.flash('success', '🗑️ ডিলিট হয়েছে');
  res.redirect('/admin/dashboard#products');
});

router.post('/orders/complete/:id', isAdmin,
  upload.fields([{ name: 'adminPdf', maxCount: 1 }, { name: 'adminImage', maxCount: 1 }]),
  async (req, res) => {
    try {
      const fs = require('fs');
      const { adminText } = req.body;
      const updateData = {
        status: 'completed',
        adminText: adminText || ''
      };

      if (req.files && req.files['adminPdf'] && req.files['adminPdf'][0]) {
        const pdf = req.files['adminPdf'][0];
        const pdfData = fs.readFileSync(pdf.path);
        updateData.adminPdfData = pdfData.toString('base64');
        updateData.adminPdfName = pdf.originalname;
        updateData.adminPdfMime = pdf.mimetype || 'application/octet-stream';
        fs.unlinkSync(pdf.path);
      }

      if (req.files && req.files['adminImage'] && req.files['adminImage'][0]) {
        const img = req.files['adminImage'][0];
        const imgData = fs.readFileSync(img.path);
        updateData.adminImageData = imgData.toString('base64');
        updateData.adminImageName = img.originalname;
        updateData.adminImageMime = img.mimetype || 'application/octet-stream';
        fs.unlinkSync(img.path);
      }

      await Order.findByIdAndUpdate(req.params.id, updateData);
      req.flash('success', '✅ অর্ডার কমপ্লিট হয়েছে');
      res.redirect('/admin/dashboard#orders');
    } catch (e) {
      req.flash('error', 'সমস্যা: ' + e.message);
      res.redirect('/admin/dashboard');
    }
  });


router.post('/notice/:userId', isAdmin, async (req, res) => {
  await Notice.create({ user: req.params.userId, message: req.body.message });
  req.flash('success', '✅ নোটিশ পাঠানো হয়েছে');
  res.redirect('/admin/dashboard#users');
});

router.post('/settings', isAdmin, async (req, res) => {
  const { siteName, tagline, bkashNumber, nagadNumber, paymentNumber, whatsappSupport, whatsappAdmin, marqueeText } = req.body;
  let s = await Setting.findOne();
  if (!s) s = new Setting();
  Object.assign(s, { siteName, tagline, bkashNumber, nagadNumber, paymentNumber, whatsappSupport, whatsappAdmin, marqueeText });
  await s.save();
  req.flash('success', '✅ সেটিংস সেভ হয়েছে');
  res.redirect('/admin/dashboard#settings');
});
// ============= রিচার্জ ম্যানেজমেন্ট =============

// পেন্ডিং রিচার্জ লিস্ট
router.get('/recharges', isAdmin, async (req, res) => {
  const pending = await Transaction.find({ status: 'pending' })
    .populate('user').sort('-createdAt');
  const approved = await Transaction.find({ status: 'approved' })
    .populate('user').sort('-createdAt').limit(20);
  const rejected = await Transaction.find({ status: 'rejected' })
    .populate('user').sort('-createdAt').limit(20);
  res.render('admin/recharges', { pending, approved, rejected });
});

// Approve — ব্যালেন্স যোগ করুন
router.post('/recharges/approve/:id', isAdmin, async (req, res) => {
  try {
    const trx = await Transaction.findById(req.params.id);
    if (!trx || trx.status !== 'pending') {
      req.flash('error', 'রিকোয়েস্ট পাওয়া যায়নি বা আগেই প্রসেস হয়েছে');
      return res.redirect('/admin/recharges');
    }

    trx.status = 'approved';
    await trx.save();

    const user = await User.findById(trx.user);
    user.balance += trx.amount;
    await user.save();

    req.flash('success', `✅ ৳${trx.amount} অনুমোদন করা হয়েছে। ${user.name} এর ব্যালেন্সে যোগ হয়েছে।`);
    res.redirect('/admin/recharges');
  } catch (e) {
    req.flash('error', 'সমস্যা হয়েছে: ' + e.message);
    res.redirect('/admin/recharges');
  }
});

// Reject — ব্যালেন্স যোগ হবে না
router.post('/recharges/reject/:id', isAdmin, async (req, res) => {
  try {
    const trx = await Transaction.findById(req.params.id);
    if (!trx || trx.status !== 'pending') {
      req.flash('error', 'রিকোয়েস্ট পাওয়া যায়নি বা আগেই প্রসেস হয়েছে');
      return res.redirect('/admin/recharges');
    }

    trx.status = 'rejected';
    await trx.save();

    req.flash('success', `❌ ৳${trx.amount} রিকোয়েস্ট বাতিল করা হয়েছে`);
    res.redirect('/admin/recharges');
  } catch (e) {
    req.flash('error', 'সমস্যা হয়েছে: ' + e.message);
    res.redirect('/admin/recharges');
  }
});
// ============= সার্ভিস ম্যানেজমেন্ট =============

router.get('/services', isAdmin, async (req, res) => {
  const services = await Service.find().sort('category sortOrder');
  res.render('admin/services', { services });
});

router.post('/services/add', isAdmin, async (req, res) => {
  try {
    const { name, category, description, optionLabels, optionPrices } = req.body;
    const options = [];
    if (optionLabels) {
      const labels = Array.isArray(optionLabels) ? optionLabels : [optionLabels];
      const prices = Array.isArray(optionPrices) ? optionPrices : [optionPrices];
      labels.forEach((label, i) => {
        if (label && prices[i]) options.push({ label, price: Number(prices[i]) });
      });
    }
    await Service.create({ name, category, description: description || '', options });
    req.flash('success', '✅ সার্ভিস যোগ হয়েছে');
    res.redirect('/admin/services');
  } catch (e) {
    req.flash('error', 'সমস্যা: ' + e.message);
    res.redirect('/admin/services');
  }
});

router.post('/services/edit/:id', isAdmin, async (req, res) => {
  try {
    const { name, category, description, optionLabels, optionPrices } = req.body;
    const options = [];
    if (optionLabels) {
      const labels = Array.isArray(optionLabels) ? optionLabels : [optionLabels];
      const prices = Array.isArray(optionPrices) ? optionPrices : [optionPrices];
      labels.forEach((label, i) => {
        if (label && prices[i]) options.push({ label, price: Number(prices[i]) });
      });
    }
    await Service.findByIdAndUpdate(req.params.id, { name, category, description, options });
    req.flash('success', '✅ সার্ভিস আপডেট হয়েছে');
    res.redirect('/admin/services');
  } catch (e) {
    req.flash('error', 'সমস্যা: ' + e.message);
    res.redirect('/admin/services');
  }
});

router.post('/services/toggle/:id', isAdmin, async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (service) {
    service.active = !service.active;
    await service.save();
    req.flash('success', service.active ? '✅ সার্ভিস চালু হয়েছে' : '⏸️ সার্ভিস বন্ধ হয়েছে');
  }
  res.redirect('/admin/services');
});

router.post('/services/delete/:id', isAdmin, async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  req.flash('success', '🗑️ সার্ভিস ডিলিট হয়েছে');
  res.redirect('/admin/services');
});
// অর্ডার ডিলিট
router.post('/orders/delete/:id', isAdmin, async (req, res) => {
  try {
    const o = await Order.findById(req.params.id);
    if (!o) {
      req.flash('error', 'অর্ডার পাওয়া যায়নি');
      return res.redirect('/admin/dashboard#orders');
    }
    await Order.findByIdAndDelete(req.params.id);
    req.flash('success', '🗑️ অর্ডার ডিলিট হয়েছে');
    res.redirect('/admin/dashboard#orders');
  } catch (e) {
    req.flash('error', 'সমস্যা: ' + e.message);
    res.redirect('/admin/dashboard#orders');
  }
});

// অর্ডার ক্যান্সেল — ব্যালেন্স ফেরত
router.post('/orders/cancel/:id', isAdmin, async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const o = await Order.findById(req.params.id);
    if (!o) {
      req.flash('error', 'অর্ডার পাওয়া যায়নি');
      return res.redirect('/admin/dashboard#orders');
    }

    if (o.status === 'completed') {
      req.flash('error', 'কমপ্লিট অর্ডার ক্যান্সেল করা যাবে না');
      return res.redirect('/admin/dashboard#orders');
    }

    if (o.status === 'cancelled') {
      req.flash('error', 'এই অর্ডার আগেই ক্যান্সেল হয়েছে');
      return res.redirect('/admin/dashboard#orders');
    }

    const refundAmount = o.price || o.selectedPrice || 0;
    const user = await User.findById(o.user);
    if (user && refundAmount > 0) {
      user.balance += refundAmount;
      await user.save();
    }

    o.status = 'cancelled';
    o.cancelReason = cancelReason || 'দুঃখিত, আপনার অর্ডারটি ক্যান্সেল করা হয়েছে।';
    await o.save();

    await Notice.create({
      user: o.user,
      message: '❌ আপনার অর্ডারটি ক্যান্সেল করা হয়েছে।\n\nকারণ: ' + o.cancelReason + '\n\n💰 ৳' + refundAmount + ' আপনার ব্যালেন্সে ফেরত দেওয়া হয়েছে।'
    });

    req.flash('success', `✅ অর্ডার ক্যান্সেল হয়েছে — ৳${refundAmount} ফেরত দেওয়া হয়েছে`);
    res.redirect('/admin/dashboard#orders');
  } catch (e) {
    req.flash('error', 'সমস্যা: ' + e.message);
    res.redirect('/admin/dashboard#orders');
  }
});

module.exports = router;