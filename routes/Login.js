const express = require("express");
const router = express.Router();
const pool = require("../config/config"); // Import the MySQL connection pool
require("dotenv").config();

router.post('/login', async (req, res) => {
    const { email} = req.body;
    console.log('Request Body:', req.body); // Log the incoming request body

    // Validate inputs
    if (!email) {
        return res.status(400).json({ message: "Email are required" });
    }
    

    const sql = "SELECT id, role, name, email, customer_code, profile_picture FROM users WHERE email = ?";

    try {
        const connection = await pool.getConnection();
        const [results] = await connection.execute(sql, [email]);
        connection.release(); // Release the connection back to the pool

        if (results.length > 0) {
            res.json({ id: results[0].id, login: true, message: "Login successful" ,profile_picture: results[0].profile_picture, role: results[0].role, name: results[0].name, email: results[0].email, customer_code: results[0].customer_code });
        } else {
            return res.status(401).json({ login: false, message: "Invalid email" });
        }
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
module.exports = router;