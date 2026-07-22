const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const eventId = req.body.event_id;
    const rating = parseInt(req.body.rating);
    const comment = (req.body.comment || '').trim();

    if (!eventId || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Valid event ID and rating (1-5) are required.' });
    }

    const [events] = await query('SELECT id FROM events WHERE id = ?', [eventId]);
    if (!events.length) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await query(
      'INSERT INTO reviews (user_id, event_id, rating, comment) VALUES (?, ?, ?, ?)',
      [req.user.id, eventId, rating, comment]
    );

    res.json({ success: true, message: 'Review submitted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
