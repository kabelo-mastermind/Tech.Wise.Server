const express = require("express");
const router = express.Router();
const pool = require("../config/config");
require("dotenv").config();
const multer = require("multer");
const { bucket } = require("../config/googleCloudConfig"); // Import your custom Google Cloud config
const path = require("path");

// Multer setup for file handling
const multerStorage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: multerStorage });


// Helper function to upload file to Google Cloud Storage
const uploadFile = async (file) => {
  try {
    const blob = bucket.file(Date.now() + "-" + file.originalname); // Unique file name
    const blobStream = blob.createWriteStream({
      resumable: false,
      gzip: true,
      contentType: file.mimetype,
    });

    return new Promise((resolve, reject) => {
      blobStream.on("finish", () => {
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(fileUrl);
      });

      blobStream.on("error", (err) => {
        console.error("Error uploading file:", err);
        reject(err);
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error("Error during file upload:", error);
    throw new Error("Error during file upload");
  }
};

// Route to upload driver details and documents
router.post("/driver_details", async (req, res) => {
  try {
    const {
      user_id,
      status = "pending", // Default values
      state = "offline",
      last_online_timestamp,
      id_copy,
      police_clearance,
      pdp,
      car_inspection,
      driver_license
    } = req.body;

    // Only validate user_id and timestamp as required
    if (!user_id || !last_online_timestamp) {
      return res.status(400).send('user_id and timestamp are required.');
    }

    // Get current document values if they exist
    const [existingDriver] = await pool.query(`SELECT * FROM driver WHERE users_id = ?`, [user_id]);

    // Prepare update data - use existing values if not provided
    const updateData = {
      status: status || existingDriver[0]?.status || "pending",
      state: state || existingDriver[0]?.state || "offline",
      last_online_timestamp,
      id_copy: id_copy || existingDriver[0]?.id_copy || null,
      police_clearance: police_clearance || existingDriver[0]?.police_clearance || null,
      pdp: pdp || existingDriver[0]?.pdp || null,
      car_inspection: car_inspection || existingDriver[0]?.car_inspection || null,
      driver_license: driver_license || existingDriver[0]?.driver_license || null,
    };

    if (existingDriver.length > 0) {
      await pool.query(`
        UPDATE driver SET 
          status = ?, 
          state = ?, 
          last_online_timestamp = ?, 
          id_copy = ?, 
          police_clearance = ?, 
          pdp = ?, 
          car_inspection = ?, 
          driver_license = ?,
          document_upload_time = NOW()
        WHERE users_id = ?
      `, [...Object.values(updateData), user_id]);
    } else {
      await pool.query(`
        INSERT INTO driver SET ?
      `, { ...updateData, users_id: user_id });
    }

    res.json({ success: true, message: "Driver documents updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// Endpoint to fetch driver details (all or by userId)
router.get('/more_details/user', async (req, res) => {
  const { userId } = req.query;

  let sql = "SELECT * FROM driver";
  const queryParams = [];

  // If userId is provided, filter by it
  if (userId) {
    sql += " WHERE users_id = ?";
    queryParams.push(userId);
    console.log('Fetching driver details for userId:', userId);
  } else {
    console.log('Fetching all driver details');
  }

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, queryParams);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No driver details found' });
    }

    res.json({ driver: rows });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error while fetching driver details' });
  }
});



// Endpoint to fetch driver documents by driver ID
router.get('/driver_documents/:id', async (req, res) => {
  const driverId = req.params.id;  // Get driverId from URL params

  console.log('Fetching driver documents for driverId:', driverId);

  if (!driverId) {
    return res.status(400).json({ message: 'Driver ID is required' });
  }

  const sql = "SELECT * FROM driver WHERE users_id = ?";

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(sql, [driverId]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // If no records are found, return a 404 status
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No documents found for the specified driver' });
    }

    // If driver documents are found, return them in the response
    res.json({ documentsFound: true, documents: rows });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error while fetching driver documents' });
  }
});


// Endpoint to update driver documents by driver ID
router.put('/driver_documents/:id', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'id_copy', maxCount: 1 },
  { name: 'police_clearance', maxCount: 1 },
  { name: 'pdp', maxCount: 1 }
]), async (req, res) => {
  const driverId = req.params.id;  // Get driverId from URL params

  console.log('Updating driver documents for driverId:', driverId);

  // Extract the necessary fields from the request body
  const { payment_url } = req.body;
  const { photo, id_copy, police_clearance, pdp } = req.files;

  // Create an array of fields to update, only including those that were provided
  const updates = [];
  if (photo) updates.push(`photo = '${photo[0].filename}'`);
  if (id_copy) updates.push(`id_copy = '${id_copy[0].filename}'`);
  if (police_clearance) updates.push(`police_clearance = '${police_clearance[0].filename}'`);
  if (pdp) updates.push(`pdp = '${pdp[0].filename}'`);
  if (payment_url) updates.push(`URL_payment = '${payment_url}'`);

  // If there are no updates to be made, return an error
  if (updates.length === 0) {
    return res.status(400).json({ message: 'No valid fields provided for update' });
  }

  // Construct the SQL UPDATE query
  const sql = `UPDATE driver SET ${updates.join(', ')} WHERE users_id = ?`;

  try {
    const startTime = Date.now();
    const [result] = await pool.query(sql, [driverId]);
    console.log(`Query executed in ${Date.now() - startTime} ms`);

    // If no rows were affected, return a 404 (driver not found or no changes made)
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Driver not found or no changes made' });
    }

    // If the update is successful, return a success message
    res.status(200).json({ message: 'Driver documents updated successfully', result });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal server error while updating driver documents' });
  }
});




module.exports = router;
