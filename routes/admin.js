const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Notice = require('../models/Notice');
const Setting = require('../models/Setting');
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
  const orders = await Order.find().populate('user product').sort('-createdAt');
  const setting = await Setting.findOne() || {};
  res.render('admin/dashboard', { users, products, orders, setting });
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
    const { adminText } = req.body;
    const pdf = req.files['adminPdf'] ? req.files['adminPdf'][0].filename : null;
    const img = req.files['adminImage'] ? req.files['adminImage'][0].filename : null;
    await Order.findByIdAndUpdate(req.params.id, {
      status: 'completed', adminPdf: pdf, adminImage: img, adminText
    });
    req.flash('success', '✅ অর্ডার কমপ্লিট হয়েছে');
    res.redirect('/admin/dashboard#orders');
});

router.post('/notice/:userId', isAdmin, async (req, res) => {
  await Notice.create({ user: req.params.userId, message: req.body.message });
  req.flash('success', '✅ নোটিশ পাঠানো হয়েছে');
  res.redirect('/admin/dashboard#users');
});

router.post('/settings', isAdmin, async (req, res) => {
  const { siteName, tagline, bkashNumber, nagadNumber, paymentNumber, whatsappSupport, whatsappAdmin } = req.body;
  let s = await Setting.findOne();
  if (!s) s = new Setting();
  Object.assign(s, { siteName, tagline, bkashNumber, nagadNumber, paymentNumber, whatsappSupport, whatsappAdmin });
  await s.save();
  req.flash('success', '✅ সেটিংস সেভ হয়েছে');
  res.redirect('/admin/dashboard#settings');
});

module.exports = router;