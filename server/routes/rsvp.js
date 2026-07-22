const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const type = req.query.type || 'all';
    let created = [];
    let rsvpd = [];

    if (type === 'all' || type === 'created') {
      const [rows] = await query(`
        SELECT e.*, u.name AS organizer_name,
               (SELECT COUNT(*)::int FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS rsvp_count
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        WHERE e.organizer_id = ?
        ORDER BY e.date DESC
      `, [req.user.id]);
      created = rows;
    }

    if (type === 'all' || type === 'rsvpd') {
      const [rows] = await query(`
        SELECT e.*, u.name AS organizer_name, rv.status AS rsvp_status,
               (SELECT COUNT(*)::int FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS rsvp_count
        FROM rsvps rv
        JOIN events e ON rv.event_id = e.id
        JOIN users u ON e.organizer_id = u.id
        WHERE rv.user_id = ? AND rv.status = 'going'
        ORDER BY e.date ASC
      `, [req.user.id]);
      rsvpd = rows;
    }

    res.json({ success: true, created, rsvpd });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const eventId = req.body.event_id;
    const status = req.body.status || 'going';

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const [events] = await query('SELECT id FROM events WHERE id = ?', [eventId]);
    if (!events.length) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (status === 'cancelled') {
      await query('DELETE FROM rsvps WHERE user_id = ? AND event_id = ?', [req.user.id, eventId]);
      return res.json({ success: true, message: 'RSVP cancelled.' });
    }

    await query(`
      INSERT INTO rsvps (user_id, event_id, status) VALUES (?, ?, ?)
      ON CONFLICT (user_id, event_id) DO UPDATE SET status = EXCLUDED.status
    `, [req.user.id, eventId, status]);

    res.json({ success: true, message: 'RSVP confirmed!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
