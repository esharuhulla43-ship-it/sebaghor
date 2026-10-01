exports.isLoggedIn = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/login');
};

exports.isActiveUser = async (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  const User = require('../models/User');
  const fresh = await User.findById(req.session.user._id);
  if (!fresh) return res.redirect('/logout');
  req.session.user = fresh;
  if (fresh.role !== 'admin' && !fresh.isActive) return res.redirect('/blocked');
  next();
};