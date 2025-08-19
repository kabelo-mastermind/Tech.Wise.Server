const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection

// Endpoint to count approved drivers
router.get('/approved_drivers', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM driver WHERE status = 'approved'`;

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(query);
    console.log(`✅ Count of approved drivers fetched in ${Date.now() - startTime} ms`);

    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('❌ Error counting approved drivers:', error);
    res.status(500).json({ message: 'Internal server error while counting approved drivers' });
  }
});

// Endpoint to count customers
router.get('/count_customers', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM users WHERE role = 'customer'`;

  try {
    const [rows] = await pool.query(query);
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Error counting customers:', error);
    res.status(500).json({ message: 'Internal server error while counting customers' });
  }
});

// Endpoint to count drivers
router.get('/count_drivers', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM users WHERE role = 'driver'`;

  try {
    const [rows] = await pool.query(query);
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Error counting drivers:', error);
    res.status(500).json({ message: 'Internal server error while counting drivers' });
  }
});

// Endpoint to count all trips
router.get('/count_trips', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM trips`;

  try {
    const [rows] = await pool.query(query);
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('❌ Error fetching trip count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Endpoint to count subscriptions grouped by user_id
router.get('/count_subscriptions', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS totalSubscriptions,
      COUNT(DISTINCT user_id) AS uniqueSubscribers
    FROM subscriptions
  `;

  try {
    const [rows] = await pool.query(query);
    res.json(rows[0]); // returns: { totalSubscriptions: X, uniqueSubscribers: Y }
  } catch (error) {
    console.error('❌ Error fetching subscription count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get monthly subscription trends
router.get('/subscriptions/trends', async (req, res) => {
  const query = `
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') AS month,
      plan_name,
      statuses,
      COUNT(*) AS count
    FROM subscriptions
    GROUP BY month, plan_name, statuses
    ORDER BY month ASC;
  `;

  try {
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching subscription trends:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/drivers
router.get('/drivers', async (req, res) => {
  const query = `
    SELECT 
      d.id_copy, d.users_id, d.police_clearance, d.pdp, d.status, d.state, d.car_inspection, d.driver_license, d.document_upload_time,
      u.name, u.email, u.role, u.phoneNumber, u.address, u.lastName, u.current_address, u.gender, u.profile_picture, u.user_uid, u.customer_code
    FROM driver d
    JOIN users u ON d.users_id = u.id
  `;
  try {
    const [rows] = await pool.query(query);
    res.json({ message: "data retrieved", rows });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
//GET /api/customers
router.get('/customers', async (req, res) => {
  const { search } = req.query;

  let query = `
    SELECT
       id, name, lastname, email, phoneNumber, current_address, role, profile_picture,
       CASE
         WHEN TIMESTAMPDIFF(DAY, last_login, NOW()) <= 7 THEN 'active'
         ELSE 'inactive'
       END AS status
    FROM users
    WHERE role = 'customer'`;

  const params = [];

  if (search) {
    query += ` AND (name LIKE ? OR lastname LIKE ? OR email LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  try {
    const [rows] = await pool.query(query, params);
    res.json({ message: "customers retrieved", rows });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// GET /api/driver/:userId
router.get('/drivers/:userId', async (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT 
      d.id_copy, d.users_id, d.police_clearance, d.pdp, d.status, d.state, d.car_inspection, d.driver_license, d.document_upload_time,
      u.name, u.email, u.role, u.phoneNumber, u.address, u.lastName, u.current_address, u.gender, u.profile_picture, u.user_uid, u.customer_code
    FROM driver d
    JOIN users u ON d.users_id = u.id
    WHERE d.users_id = ?
  `;

  try {
    const [rows] = await pool.query(query, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching driver by userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/drivers/:userId

router.put('/drivers/:userId', async (req, res) => {
  const { userId } = req.params;
  const {
    name,
    lastName,
    email,
    phoneNumber,
    address,
    current_address,
    gender,
    status,
    state
    // Do NOT include profile_picture or document fields here!
  } = req.body;
  // check if user exists
  const userQuery = `
    SELECT id, name, lastName
    FROM users
    WHERE id = ?
  `;

  try {
    const [rows] = await pool.query(userQuery, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User doesn't exist" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }

  // Update users table
  const userUpdateQuery = `
    UPDATE users
    SET name = ?, lastName = ?, email = ?, phoneNumber = ?, address = ?, current_address = ?, gender = ?
    WHERE id = ?
  `;

  // Update driver table
  const driverUpdateQuery = `
    UPDATE driver
    SET status = ?, state = ?
    WHERE users_id = ?
  `;

  try {
    // Update users table
    await pool.query(userUpdateQuery, [
      name,
      lastName,
      email,
      phoneNumber,
      address,
      current_address,
      gender,
      userId
    ]);

    // Update driver table
    await pool.query(driverUpdateQuery, [
      status,
      state,
      userId
    ]);


    res.json({ message: "Driver updated successfully" });


  } catch (error) {
    console.error("Error updating driver by userId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//get vehicle
router.get('/get-all-vehicles', async (req, res) => {
  

  let query = `
    SELECT
      *
    FROM vehicle
   `;

 
  try {
    const [rows] = await pool.query(query);
    res.json({ message: "vehicles retrieved", rows });
  } catch (error) {
    console.error("Error fetching vehicles", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
