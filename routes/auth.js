const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Setting = require('../models/Setting');

router.get('/register', (req, res) => res.render('register'));

router.post('/register', async (req, res) => {
  const { name, mobile, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    req.flash('error', 'পাসওয়ার্ড মিলছে না');
    return res.redirect('/register');
  }
  try {
    const ex = await User.findOne({ $or: [{ mobile }, { email }] });
    if (ex) {
      req.flash('error', 'মোবাইল বা ইমেইল আগে থেকেই আছে');
      return res.redirect('/register');
    }
    await User.create({ name, mobile, email, password });
    req.flash('success', '✅ রেজিস্ট্রেশন সফল! এডমিন একটিভ করলে লগইন করতে পারবেন।');
    res.redirect('/login');
  } catch (e) {
    req.flash('error', 'কিছু ভুল হয়েছে');
    res.redirect('/register');
  }
});

router.get('/login', async (req, res) => {
  let setting = await Setting.findOne();
  if (!setting) setting = await Setting.create({});
  res.render('login', { setting });
});

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({ $or: [{ mobile: identifier }, { email: identifier }] });
  if (!user || !(await user.comparePassword(password))) {
    req.flash('error', 'ভুল তথ্য দিয়েছেন');
    return res.redirect('/login');
  }
  req.session.user = user;
  res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;