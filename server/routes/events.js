const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { id, category, search, sort, date, organizer_id, featured, limit } = req.query;

    if (id) {
      const [events] = await query(`
        SELECT e.*, u.name AS organizer_name,
               (SELECT COUNT(*)::int FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS rsvp_count,
               (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews rv WHERE rv.event_id = e.id) AS avg_rating
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        WHERE e.id = ?
      `, [id]);

      if (!events.length) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      const [reviews] = await query(`
        SELECT r.*, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ?
        ORDER BY r.created_at DESC
      `, [id]);

      return res.json({ success: true, event: events[0], reviews });
    }

    let sql = `
      SELECT e.*, u.name AS organizer_name,
             (SELECT COUNT(*)::int FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS rsvp_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (e.title ILIKE ? OR e.description ILIKE ? OR e.location ILIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (date) {
      sql += ' AND e.date = ?';
      params.push(date);
    }
    if (organizer_id) {
      sql += ' AND e.organizer_id = ?';
      params.push(organizer_id);
    }
    if (featured) {
      sql += ' AND e.date >= CURRENT_DATE';
    }

    const sortMap = {
      date_desc: 'e.date DESC, e.time DESC',
      title_asc: 'e.title ASC',
      price_asc: 'e.price ASC',
      price_desc: 'e.price DESC',
    };
    sql += ` ORDER BY ${sortMap[sort] || 'e.date ASC, e.time ASC'}`;
    sql += ` LIMIT ${Math.min(parseInt(limit) || 50, 100)}`;

    const [events] = await query(sql, params);
    res.json({ success: true, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/create', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, date, time, location, price } = req.body;

    if (!title?.trim() || !description?.trim() || !category || !date || !time || !location?.trim()) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }

    const imagePath = req.file ? `uploads/${req.file.filename}` : 'images/default-event.jpg';

    const [inserted] = await query(`
      INSERT INTO events (title, description, category, date, time, location, price, image, organizer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
      title.trim(), description.trim(), category, date, time,
      location.trim(), parseFloat(price) || 0, imagePath, req.user.id,
    ]);

    res.json({ success: true, message: 'Event created successfully.', event_id: inserted[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/update', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { id, title, description, category, date, time, location, price } = req.body;

    if (!id || !title?.trim() || !description?.trim() || !category || !date || !time || !location?.trim()) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }

    const [events] = await query('SELECT organizer_id FROM events WHERE id = ?', [id]);
    if (!events.length) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    if (Number(events[0].organizer_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this event.' });
    }

    if (req.file) {
      await query(`
        UPDATE events SET title=?, description=?, category=?, date=?, time=?, location=?, price=?, image=?
        WHERE id=?
      `, [title.trim(), description.trim(), category, date, time, location.trim(), parseFloat(price) || 0, `uploads/${req.file.filename}`, id]);
    } else {
      await query(`
        UPDATE events SET title=?, description=?, category=?, date=?, time=?, location=?, price=?
        WHERE id=?
      `, [title.trim(), description.trim(), category, date, time, location.trim(), parseFloat(price) || 0, id]);
    }

    res.json({ success: true, message: 'Event updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/delete', requireAuth, async (req, res) => {
  try {
    const id = req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const [events] = await query('SELECT organizer_id FROM events WHERE id = ?', [id]);
    if (!events.length) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    if (Number(events[0].organizer_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event.' });
    }

    await query('DELETE FROM events WHERE id = ?', [id]);
    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
