const express = require('express');
const router = express.Router();
const db = require('../db/connection'); 
const bcrypt = require('bcrypt');

router.get('/concerts', (req, res) => { 
const query = ` 
  SELECT 
    c.concert_id,
    c.concert_name,
    c.concert_date,
    v.venue,   
    GROUP_CONCAT(a.artist_name SEPARATOR ', ') AS artists
  FROM concert c
  LEFT JOIN venue v ON c.venue_id = v.venue_id
  LEFT JOIN concert_artist ca ON c.concert_id = ca.concert_id
  LEFT JOIN artist a ON ca.artist_id = a.artist_id
  GROUP BY c.concert_id, c.concert_name, c.concert_date, v.venue
  ORDER BY c.concert_date ASC
`;

  db.query(query, (err, results) => { 
    if (err) return res.status(500).json({ error: err.message }); 
    res.json(results); 
  });
});

// GET all attendees
router.get('/attendees', (req, res) => {
  db.query("SELECT * FROM attendee", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST - Register a new attendee
router.post('/attendees', (req, res) => {
  const { attendee_name, email } = req.body;
  db.query(
    "INSERT INTO attendee (attendee_name, email) VALUES (?, ?)",
    [attendee_name, email],
    (err, result) => {
      if (err) {
        console.error('Error adding attendee:', err.sqlMessage || err);
        return res.status(500).json({ error: err.sqlMessage });
      }
      res.json({ message: 'Attendee registered!', attendee_id: result.insertId });
    }
  );
});

// PUT - Update an attendee
router.put('/attendees/:id', (req, res) => {
  const { id } = req.params;
  const { attendee_name, email } = req.body;
  db.query(
    "UPDATE attendee SET attendee_name = ?, email = ? WHERE attendee_id = ?",
    [attendee_name, email, id],
    (err) => {
      if (err) {
        console.error('Error updating attendee:', err.sqlMessage || err);
        return res.status(500).json({ error: err.sqlMessage });
      }
      res.json({ message: 'Attendee updated!' });
    }
  );
});

// DELETE - Remove an attendee (blocked if bookings exist)
router.delete('/attendees/:id', (req, res) => {
  const { id } = req.params;

  db.query("SELECT COUNT(*) AS bookingCount FROM booking WHERE attendee_id = ?", [id], (err, results) => {
    if (err) {
      console.error('Error checking bookings:', err.sqlMessage || err);
      return res.status(500).json({ error: err.sqlMessage });
    }

    if (results[0].bookingCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete: this attendee has existing bookings.'
      });
    }

    db.query("DELETE FROM attendee WHERE attendee_id = ?", [id], (err2) => {
      if (err2) {
        console.error('Error deleting attendee:', err2.sqlMessage || err2);
        return res.status(500).json({ error: err2.sqlMessage });
      }
      res.json({ message: 'Attendee deleted successfully!' });
    });
  });
});

// ---------------- AUTH ----------------

// POST - Register a new attendee
router.post('/register', (req, res) => {
  const { attendee_name, email, password } = req.body;

  if (!attendee_name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are all required.' });
  }

  db.query("SELECT attendee_id FROM attendee WHERE email = ?", [email], (err, existing) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });

    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) return res.status(500).json({ error: 'Error securing password.' });

      db.query(
        "INSERT INTO attendee (attendee_name, email, password) VALUES (?, ?, ?)",
        [attendee_name, email, hashedPassword],
        (insertErr, result) => {
          if (insertErr) return res.status(500).json({ error: insertErr.sqlMessage || insertErr.message });

          req.session.attendee_id = result.insertId;
          req.session.attendee_name = attendee_name;
          res.json({ message: 'Registered successfully!', attendee_name });
        }
      );
    });
  });
});

// POST - Log in
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.query("SELECT * FROM attendee WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const attendee = results[0];

    bcrypt.compare(password, attendee.password, (compareErr, match) => {
      if (compareErr) return res.status(500).json({ error: 'Error verifying password.' });

      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      req.session.attendee_id = attendee.attendee_id;
      req.session.attendee_name = attendee.attendee_name;
      res.json({ message: 'Logged in!', attendee_name: attendee.attendee_name });
    });
  });
});

// POST - Log out
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Error logging out.' });
    res.json({ message: 'Logged out successfully!' });
  });
});

// GET - Check current session (so the frontend can tell if someone's logged in)
router.get('/me', (req, res) => {
  if (!req.session.attendee_id) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  res.json({ attendee_id: req.session.attendee_id, attendee_name: req.session.attendee_name });
});

module.exports = router;
