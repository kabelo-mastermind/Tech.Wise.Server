const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection

// Submit rating and feedback
router.post('/ride/rating', async (req, res) => {
  const { tripId, userId, rating, feedback = '', role } = req.body;

  try {
    // 1. Conditionally update the correct rating column in trips table
    if (role === 'customer') {
      await pool.query(
        `UPDATE trips SET driver_ratings  = ?, customer_feedback = ? WHERE id = ?`,
        [rating, tripId, feedback.trim() ? feedback : null]
      );
    } else if (role === 'driver') {
      await pool.query(
        `UPDATE trips SET customer_rating  = ?, driver_feedback = ? WHERE id = ?`,
        [rating, tripId, feedback.trim() ? feedback : null]
      );
    } else if (role === 'all') {
      // No trip table update if role is 'all', just insert feedback
    } else {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // 2. Only insert feedback if role is 'all'
    if (role === 'all') {
      await pool.query(
        `INSERT INTO feedback (userId, content, rating, role, createdAt)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, feedback.trim() ? feedback : null, rating, role]
      );
    }

    res.status(200).json({ message: 'Rating and feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting rating and feedback:', error);
    res.status(500).json({ error: 'Failed to submit rating and feedback' });
  }
});

module.exports = router;
