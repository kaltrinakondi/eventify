function getUser(req) {
  if (!req.session.userId) return null;
  return {
    id: req.session.userId,
    name: req.session.userName,
    email: req.session.userEmail,
    role: req.session.userRole,
  };
}

function requireAuth(req, res, next) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  req.user = user;
  next();
}

module.exports = { getUser, requireAuth, requireAdmin };
