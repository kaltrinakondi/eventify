const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const action = req.query.action || 'stats';

    if (action === 'stats') {
      const [userRows] = await query('SELECT COUNT(*)::int AS count FROM users');
      const [eventRows] = await query('SELECT COUNT(*)::int AS count FROM events');
      const [rsvpRows] = await query("SELECT COUNT(*)::int AS count FROM rsvps WHERE status = 'going'");
      const [reviewRows] = await query('SELECT COUNT(*)::int AS count FROM reviews');
      const [upcomingRows] = await query('SELECT COUNT(*)::int AS count FROM events WHERE date >= CURRENT_DATE');

      return res.json({
        success: true,
        stats: {
          users: userRows[0].count,
          events: eventRows[0].count,
          rsvps: rsvpRows[0].count,
          reviews: reviewRows[0].count,
          upcoming: upcomingRows[0].count,
        },
      });
    }

    if (action === 'users') {
      const [users] = await query(
        'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
      );
      return res.json({ success: true, users });
    }

    if (action === 'events') {
      const [events] = await query(`
        SELECT e.*, u.name AS organizer_name
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        ORDER BY e.created_at DESC
      `);
      return res.json({ success: true, events });
    }

    res.status(400).json({ success: false, message: 'Invalid action.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/delete-user', requireAdmin, async (req, res) => {
  try {
    const id = req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID required.' });
    }
    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    await query("DELETE FROM users WHERE id = ? AND role != 'admin'", [id]);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
