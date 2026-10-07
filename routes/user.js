const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Notice = require('../models/Notice');
const Setting = require('../models/Setting');
const Service = require('../models/Service');
const { isActiveUser } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, f, cb) => cb(null, Date.now() + '-' + f.originalname)
});
const upload = multer({ storage });

router.get('/dashboard', isActiveUser, async (req, res) => {
  const user = await User.findById(req.session.user._id);
const services = await Service.find().sort('category sortOrder');
  const setting = await Setting.findOne() || {};
  const allNotices = await Notice.find({ user: user._id }).sort('-createdAt').limit(10);
  res.render('user/dashboard', {
    user, services, setting,
    allNotices
  });
});

router.get('/service/:id', isActiveUser, async (req, res) => {
  const service = await Service.findById(req.params.id);
  const user = await User.findById(req.session.user._id);
  if (!service || !service.active) return res.redirect('/user/dashboard');
  res.render('user/service-form', { service, user, setting: await Setting.findOne() || {} });
});

router.post('/service/:id', isActiveUser, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    const user = await User.findById(req.session.user._id);
    if (!service || !service.active) return res.redirect('/user/dashboard');

    const { optionIndex, details } = req.body;
    const option = service.options[parseInt(optionIndex)];
    if (!option) {
      req.flash('error', 'দয়া করে অপশন সিলেক্ট করুন');
      return res.redirect('/user/service/' + service._id);
    }

    if (user.balance < option.price) {
      req.flash('error', 'দয়া করে রিচার্জ করুন');
      return res.redirect('/user/recharge');
    }

    user.balance -= option.price;
    await user.save();

    await Order.create({
      user: user._id,
      service: service._id,
      selectedOption: option.label,
      selectedPrice: option.price,
      details: details || '',
      price: option.price
    });

    req.flash('success', `✅ অর্ডার সফল! স্টেটাস: পেন্ডিং`);
    res.redirect('/user/orders');
  } catch (e) {
    req.flash('error', 'সমস্যা: ' + e.message);
    res.redirect('/user/dashboard');
  }
});


router.get('/order/:id', isActiveUser, async (req, res) => {
  const product = await Product.findById(req.params.id);
  const user = await User.findById(req.session.user._id);
  if (!product) return res.redirect('/user/dashboard');
  res.render('user/order', { product, user });
});

router.post('/order/:id', isActiveUser, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  const product = await Product.findById(req.params.id);
  if (!product) return res.redirect('/user/dashboard');
  if (user.balance < product.price) {
    req.flash('error', 'দয়া করে রিচার্জ করুন');
    return res.redirect('/user/recharge');
  }
  user.balance -= product.price;
  await user.save();
  await Order.create({ user: user._id, product: product._id, price: product.price });
  req.flash('success', '✅ অর্ডার সফল হয়েছে! স্টেটাস: পেন্ডিং');
  res.redirect('/user/orders');
});

router.get('/orders', isActiveUser, async (req, res) => {
  const orders = await Order.find({ user: req.session.user._id })
    .populate('product')
    .populate('service')
    .sort('-createdAt');
  const user = await User.findById(req.session.user._id);
  res.render('user/orders', { orders, user });
});


router.get('/download/:orderId', isActiveUser, async (req, res) => {
  const o = await Order.findById(req.params.orderId)
    .populate('product')
    .populate('service');
  if (!o || o.user.toString() !== req.session.user._id.toString())
    return res.status(403).send('Unauthorized');
  if (o.status !== 'completed') return res.send('ফাইল এখনো প্রস্তুত হয়নি');

  // ফাইলের ধরন ঠিক করার ফাংশন
  function getMimeType(fileName, savedMime) {
    if (savedMime && savedMime !== 'application/octet-stream') {
      return savedMime;
    }
    if (!fileName) return 'application/octet-stream';
    
    const ext = fileName.toLowerCase().split('.').pop();
    const mimes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      txt: 'text/plain; charset=utf-8',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      apk: 'application/vnd.android.package-archive',
      exe: 'application/x-msdownload',
      msi: 'application/x-msi',
      dmg: 'application/x-apple-diskimage',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      json: 'application/json',
      xml: 'application/xml',
      csv: 'text/csv',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript'
    };
    return mimes[ext] || 'application/octet-stream';
  }

  // ফাইল ১ — PDF/যেকোনো ফাইল
  if (o.adminPdfData) {
    const buffer = Buffer.from(o.adminPdfData, 'base64');
    const fileName = o.adminPdfName || 'file';
    const mime = getMimeType(fileName, o.adminPdfMime);
    
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  }

  // ফাইল ২ — Image/যেকোনো ফাইল
  if (o.adminImageData) {
    const buffer = Buffer.from(o.adminImageData, 'base64');
    const fileName = o.adminImageName || 'file';
    const mime = getMimeType(fileName, o.adminImageMime);
    
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  }

  // টেক্সট ফাইল
  if (o.adminText) {
    const fileName = o.service ? o.service.name : (o.product ? o.product.name : 'file');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName + '.txt')}"`);
    return res.send(o.adminText);
  }

  res.send('কোনো ফাইল নেই');
});

router.get('/recharge', isActiveUser, async (req, res) => {
  const setting = await Setting.findOne() || {};
  const user = await User.findById(req.session.user._id);
  const history = await Transaction.find({ user: user._id }).sort('-createdAt');
  res.render('user/recharge', { setting, user, history });
});

router.post('/recharge', isActiveUser, async (req, res) => {
  const { amount, method, senderNumber, transactionId } = req.body;

  // TrxID আগে ব্যবহার হয়েছে কি না চেক
  const ex = await Transaction.findOne({ transactionId });
  if (ex) {
    req.flash('error', 'এই TrxID আগে ব্যবহার হয়েছে');
    return res.redirect('/user/recharge');
  }

  const user = await User.findById(req.session.user._id);

  // ⚠️ ব্যালেন্স যোগ করা হবে না — শুধু pending রিকোয়েস্ট
  await Transaction.create({
    user: user._id,
    amount,
    method,
    senderNumber,
    transactionId,
    status: 'pending'
  });

  req.flash('success', `⏳ ৳${amount} রিচার্জ রিকোয়েস্ট পাঠানো হয়েছে। অ্যাডমিন যাচাই করে অনুমোদন করলে ব্যালেন্স যোগ হবে।`);
  res.redirect('/user/recharge');
});

router.get('/notices', isActiveUser, async (req, res) => {
  const notices = await Notice.find({ user: req.session.user._id }).sort('-createdAt');
  await Notice.updateMany({ user: req.session.user._id }, { read: true });
  res.render('user/notices', { notices });
});

router.get('/profile', isActiveUser, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.render('user/profile', { user });
});

router.get('/change-password', isActiveUser, (req, res) => res.render('user/change-password', { step: 1 }));

router.post('/change-password/verify', isActiveUser, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  if (!(await user.comparePassword(req.body.currentPassword))) {
    req.flash('error', 'বর্তমান পাসওয়ার্ড ভুল');
    return res.redirect('/user/change-password');
  }
  req.session.pwOk = true;
  res.render('user/change-password', { step: 2 });
});

router.post('/change-password/save', isActiveUser, async (req, res) => {
  if (!req.session.pwOk) return res.redirect('/user/change-password');
  const { newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) {
    req.flash('error', 'পাসওয়ার্ড মিলছে না');
    return res.render('user/change-password', { step: 2 });
  }
  const user = await User.findById(req.session.user._id);
  user.password = newPassword;
  await user.save();
  req.session.pwOk = false;
  req.flash('success', '✅ পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে');
  res.redirect('/user/profile');
});
// সব নোটিশ read হিসেবে মার্ক করুন
router.post('/notices/read-all', isActiveUser, async (req, res) => {
  await Notice.updateMany(
    { user: req.session.user._id, read: false },
    { read: true }
  );
  res.json({ ok: true });
});

module.exports = router;