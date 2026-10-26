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

// ============= ID MAKER =============

const IdMaker = require('../models/IdMaker');
const IdOrder = require('../models/IdOrder');

router.get('/id-maker', isActiveUser, async (req, res) => {
  const templates = await IdMaker.find({ active: true }).sort('-createdAt');
  const user = await User.findById(req.session.user._id);
  const myOrders = await IdOrder.find({ user: user._id })
    .populate('template').sort('-createdAt').limit(20);
  res.render('user/id-maker', { templates, user, myOrders });
});

router.get('/id-maker/fill/:id', isActiveUser, async (req, res) => {
  const template = await IdMaker.findById(req.params.id);
  const user = await User.findById(req.session.user._id);
  if (!template || !template.active) return res.redirect('/user/id-maker');
  res.render('user/id-maker-form', { template, user });
});

router.post('/id-maker/fill/:id', isActiveUser, upload.fields([
  { name: 'photoFile', maxCount: 1 },
  { name: 'signatureFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const template = await IdMaker.findById(req.params.id);
    if (!template || !template.active) return res.redirect('/user/id-maker');

    if (user.balance < template.price) {
      req.flash('error', 'দয়া করে রিচার্জ করুন');
      return res.redirect('/user/recharge');
    }

    user.balance -= template.price;
    await user.save();

    const order = await IdOrder.create({
      user: user._id,
      template: template._id,
      price: template.price,
      data: {
        idNumber: req.body.idNumber || '',
        pinNumber: req.body.pinNumber || '',
        nameBangla: req.body.nameBangla || '',
        nameEnglish: req.body.nameEnglish || '',
        birthDate: req.body.birthDate || '',
        birthPlace: req.body.birthPlace || '',
        fatherName: req.body.fatherName || '',
        motherName: req.body.motherName || '',
        gender: req.body.gender || '',
        bloodGroup: req.body.bloodGroup || '',
        issueDate: req.body.issueDate || '',
        address: req.body.address || '',
        photoFile: req.files['photoFile'] ? req.files['photoFile'][0].filename : '',
        signatureFile: req.files['signatureFile'] ? req.files['signatureFile'][0].filename : ''
      }
    });

    req.flash('success', `✅ আইডি তৈরি হয়েছে — ৳${template.price} কাটা হয়েছে`);
    res.redirect('/user/id-maker/preview/' + order._id);
  } catch (e) {
    req.flash('error', 'সমস্যা: ' + e.message);
    res.redirect('/user/id-maker');
  }
});

router.get('/id-maker/preview/:id', isActiveUser, async (req, res) => {
  const order = await IdOrder.findById(req.params.id).populate('template');
  if (!order || order.user.toString() !== req.session.user._id.toString()) {
    return res.redirect('/user/id-maker');
  }
  const user = await User.findById(req.session.user._id);
  res.render('user/id-maker-preview', { order, user });
});
// ============= রিসিভ তৈরি ও ডাউনলোড (ইউজার) =============

const Receipt = require('../models/Receipt');

// ১. নতুন রিসিভ ফর্ম দেখাও
router.get('/create-receipt', isActiveUser, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  const setting = await Setting.findOne() || {};
  res.render('user/receipt-form', { user, setting });
});

// ২. ফর্ম সাবমিট করলে রিসিভ তৈরি হবে
router.post('/create-receipt', isActiveUser, async (req, res) => {
  try {
    const { customerName, customerAddress, smsAccount, customerMobile, transactionId, billAmount, chargeAmount } = req.body;
    const user = await User.findById(req.session.user._id);

    // অটো রিসিভ নাম্বার তৈরি (যেমন: 2026-01)
    let setting = await Setting.findOne();
    if (!setting) setting = new Setting();
    
    const currentYear = new Date().getFullYear();
    if (setting.lastReceiptYear !== currentYear) {
      setting.lastReceiptYear = currentYear;
      setting.lastReceiptCounter = 1;
    } else {
      setting.lastReceiptCounter += 1;
    }
    
    const receiptNumber = `${currentYear}-${String(setting.lastReceiptCounter).padStart(2, '0')}`;
    await setting.save();

    // অটো তারিখ ও বাংলা বার
    const now = new Date();
    const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const dayName = days[now.getDay()];
    const dateString = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} — ${dayName}`;

    const bill = Number(billAmount);
    const charge = Number(chargeAmount);
    const total = bill + charge;

    // রিসিভ তৈরি
    const receipt = await Receipt.create({
      user: user._id,
      receiptNumber,
      customerName,
      customerAddress,
      smsAccount,
      customerMobile,
      transactionId,
      billAmount: bill,
      chargeAmount: charge,
      totalAmount: total,
      dateTime: dateString
    });

    req.flash('success', '✅ রিসিভ তৈরি হয়েছে!');
    res.redirect('/user/receipt-preview/' + receipt._id);
  } catch (e) {
    req.flash('error', 'সমস্যা: ' + e.message);
    res.redirect('/user/create-receipt');
  }
});

// ৩. রিসিভ প্রিভিউ এবং ডাউনলোড পেজ
router.get('/receipt-preview/:id', isActiveUser, async (req, res) => {
  const receipt = await Receipt.findById(req.params.id).populate('user');
  if (!receipt || receipt.user._id.toString() !== req.session.user._id.toString()) {
    return res.redirect('/user/create-receipt');
  }
  const setting = await Setting.findOne() || {};
  res.render('user/receipt-preview', { receipt, setting });
});

module.exports = router;