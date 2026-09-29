const express = require('express');
const router = express.Router();
const db = require('../db/connection'); //MySQL connection

// ---------------- CONCERTS ----------------
// GET - View the concerts
router.get('/concerts', (req, res) => {
  const sql = `
    SELECT 
      c.concert_id,
      c.concert_name,
      c.concert_date,
      c.venue_id,
      v.venue,
      GROUP_CONCAT(a.artist_name SEPARATOR ', ') AS artists,
      GROUP_CONCAT(a.artist_id) AS artists_ids
    FROM concert c
    LEFT JOIN venue v ON c.venue_id = v.venue_id
    LEFT JOIN concert_artist ca ON c.concert_id = ca.concert_id
    LEFT JOIN artist a ON ca.artist_id = a.artist_id
    GROUP BY c.concert_id, c.concert_name, c.concert_date, c.venue_id, v.venue
    ORDER BY c.concert_date;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching concerts:', err.sqlMessage || err);
      return res.status(500).json({ error: err.sqlMessage });
    }

    const formattedResults = results.map(c => ({
      ...c,
      artists_ids: c.artists_ids ? c.artists_ids.split(',').map(id => parseInt(id)) : []
    }));

    res.json(formattedResults);
  });
});

// POST - Add a new concert
router.post('/concerts', (req, res) => {
  const { concert_name, concert_date, venue_id, artist_ids } = req.body;

  const sql = "INSERT INTO concert (concert_name, concert_date, venue_id) VALUES (?, ?, ?)";
  db.query(sql, [concert_name, concert_date, venue_id], (err, result) => {
    if (err) {
      console.error('Error adding concert:', err.sqlMessage || err);
      return res.status(500).json({ error: err.sqlMessage });
    }

    const concert_id = result.insertId;

    if (!artist_ids || artist_ids.length === 0) {
      return res.json({ message: 'Concert added!', concert_id });
    }

    const values = artist_ids.map(artist_id => [concert_id, artist_id]);
    db.query("INSERT INTO concert_artist (concert_id, artist_id) VALUES ?", [values], (err2) => {
      if (err2) {
        console.error('Error linking artists:', err2.sqlMessage || err2);
        return res.status(500).json({ error: err2.sqlMessage });
      }
      res.json({ message: 'Concert added!', concert_id });
    });
  });
});

// PUT - Update an existing concert
router.put('/concerts/:id', (req, res) => {
  const { id } = req.params;
  const { concert_name, concert_date, venue_id, artist_ids } = req.body;

  const sql = "UPDATE concert SET concert_name = ?, concert_date = ?, venue_id = ? WHERE concert_id = ?";
  db.query(sql, [concert_name, concert_date, venue_id, id], (err) => {
    if (err) {
      console.error('Error updating concert:', err.sqlMessage || err);
      return res.status(500).json({ error: err.sqlMessage });
    }

    // Replace the concert's artist links with the new selection
    db.query("DELETE FROM concert_artist WHERE concert_id = ?", [id], (err2) => {
      if (err2) {
        console.error('Error clearing old artists:', err2.sqlMessage || err2);
        return res.status(500).json({ error: err2.sqlMessage });
      }

      if (!artist_ids || artist_ids.length === 0) {
        return res.json({ message: 'Concert updated!' });
      }

      const values = artist_ids.map(artist_id => [id, artist_id]);
      db.query("INSERT INTO concert_artist (concert_id, artist_id) VALUES ?", [values], (err3) => {
        if (err3) {
          console.error('Error linking artists:', err3.sqlMessage || err3);
          return res.status(500).json({ error: err3.sqlMessage });
        }
        res.json({ message: 'Concert updated!' });
      });
    });
  });
});

// DELETE - Remove a concert (blocked if tickets exist)
router.delete('/concerts/:id', (req, res) => {
  const { id } = req.params;

  // Check for existing tickets on this concert first
  db.query("SELECT COUNT(*) AS ticketCount FROM ticket WHERE concert_id = ?", [id], (err, results) => {
    if (err) {
      console.error('Error checking tickets:', err.sqlMessage || err);
      return res.status(500).json({ error: err.sqlMessage });
    }

    if (results[0].ticketCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete: this concert has existing ticket bookings.'
      });
    }

    // No tickets exist, safe to remove artist links then the concert itself
    db.query("DELETE FROM concert_artist WHERE concert_id = ?", [id], (err2) => {
      if (err2) {
        console.error('Error deleting concert_artist links:', err2.sqlMessage || err2);
        return res.status(500).json({ error: err2.sqlMessage });
      }

      db.query("DELETE FROM concert WHERE concert_id = ?", [id], (err3) => {
        if (err3) {
          console.error('Error deleting concert:', err3.sqlMessage || err3);
          return res.status(500).json({ error: err3.sqlMessage });
        }
        res.json({ message: 'Concert deleted successfully!' });
      });
    });
  });
});

// --------------------------VENUES---------------------------------------------

// GET all venues
router.get('/venues', (req, res) => {
  db.query('SELECT venue_id, venue FROM venue', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST - Add a new venue
router.post('/venues', (req, res) => {
  const { venue, capacity } = req.body;
  db.query(
    "INSERT INTO venue (venue, capacity) VALUES (?, ?)",
    [venue, capacity],
    (err, result) => {
      if (err) {
        console.error('Error adding venue:', err.sqlMessage || err);
        return res.status(500).json({ error: err.sqlMessage });
      }
      res.json({ message: 'Venue added!', venue_id: result.insertId });
    }
  );
});

// PUT - Update a venue
router.put('/venues/:id', (req, res) => {
  const { id } = req.params;
  const { venue, capacity } = req.body;
  db.query(
    "UPDATE venue SET venue = ?, capacity = ? WHERE venue_id = ?",
    [venue, capacity, id],
    (err) => {
      if (err) {
        console.error('Error updating venue:', err.sqlMessage || err);
        return res.status(500).json({ error: err.sqlMessage });
      }
      res.json({ message: 'Venue updated!' });
    }
  );
});

// DELETE - Remove a venue (blocked if concerts use it)
router.delete('/venues/:id', (req, res) => {
  const { id } = req.params;

  db.query("SELECT COUNT(*) AS concertCount FROM concert WHERE venue_id = ?", [id], (err, results) => {
    if (err) {
      console.error('Error checking concerts:', err.sqlMessage || err);
      return res.status(500).json({ error: err.sqlMessage });
    }

    if (results[0].concertCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete: this venue has existing concerts scheduled.'
      });
    }

    db.query("DELETE FROM venue WHERE venue_id = ?", [id], (err2) => {
      if (err2) {
        console.error('Error deleting venue:', err2.sqlMessage || err2);
        return res.status(500).json({ error: err2.sqlMessage });
      }
      res.json({ message: 'Venue deleted successfully!' });
    });
  });
});

// ------------------------ ARTISTS ------------------------

// Get all artists
router.get('/artists', (req, res) => {
  db.query("SELECT * FROM artist", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add an artist
router.post('/artists', (req, res) => {
  const { name, genre } = req.body;
  db.query(
    "INSERT INTO artist (artist_name, genre) VALUES (?, ?)",
    [name, genre],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Artist added!' });
    }
  );
});

// Update an artist
router.put('/artists/:id', (req, res) => {
  const { id } = req.params;
  const { name, genre } = req.body;
  db.query(
    "UPDATE artist SET artist_name = ?, genre = ? WHERE artist_id = ?",
    [name, genre, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Artist updated!' });
    }
  );
});

// Delete an artist
router.delete('/artists/:id', (req, res) => {
  const { id } = req.params;

  console.log("DELETE route hit for artist ID:", id);

  //Delete from the concert_artist table first
  db.query("DELETE FROM concert_artist WHERE artist_id = ?", [id], (err) => {
    if (err) {
      console.error("Error deleting from concert_artist:", err);
      return res.status(500).json({ error: err.message });
    }

    //Then delete from artist table
    db.query("DELETE FROM artist WHERE artist_id = ?", [id], (err2, result) => {
      if (err2) {
        console.error("Error deleting artist:", err2);
        return res.status(500).json({ error: err2.message });
      }

      console.log("Artist deleted successfully!");
      res.json({ message: 'Artist deleted successfully!' });
    });
  });
});



module.exports = router;
