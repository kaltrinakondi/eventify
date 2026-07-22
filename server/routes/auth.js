const express = require('express');
const { query } = require('../db');
const { getUser } = require('../middleware/auth');
const { verifyPassword, hashPassword } = require('../utils/password');

const router = express.Router();

function setSession(req, user) {
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.userRole = user.role;
}

router.get('/session', (req, res) => {
  const user = getUser(req);
  if (!user) {
    return res.json({ success: true, loggedIn: false, user: null });
  }
  res.json({ success: true, loggedIn: true, user });
});

router.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim();
    const password = req.body.password || '';

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const [rows] = await query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    setSession(req, user);
    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const password = req.body.password || '';
    const confirm = req.body.confirm_password || req.body.confirmPassword || '';

    if (!name || !email || !password || !confirm) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (password !== confirm) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hash = await hashPassword(password);
    const [inserted] = await query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?) RETURNING id',
      [name, email, hash]
    );

    const user = { id: inserted[0].id, name, email, role: 'user' };
    setSession(req, user);
    res.json({ success: true, message: 'Registration successful.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;
