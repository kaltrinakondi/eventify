require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const rsvpRoutes = require('./routes/rsvp');
const reviewsRoutes = require('./routes/reviews');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const rootDir = path.join(__dirname, '..');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'eventify-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));

app.use(express.static(rootDir));

app.use('/api', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const file = req.path.endsWith('.html') || req.path.includes('.')
    ? path.join(rootDir, req.path)
    : path.join(rootDir, 'index.html');
  res.sendFile(file, (err) => {
    if (err) next();
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Eventify running at http://${HOST}:${PORT}`);
});
