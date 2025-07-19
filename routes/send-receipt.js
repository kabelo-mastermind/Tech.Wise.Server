const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config(); // make sure this is at the top

// POST /send-receipt to send trip receipt email
router.post('/send-receipt', async (req, res) => {
    const { email, name, tripId, receiptUrl } = req.body;

    if (!email || !tripId || !receiptUrl) {
        return res.status(400).json({ message: "Missing email, tripId or receiptUrl" });
    }

    try {
        // Create transporter using Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Email content
        const mailOptions = {
            from: `"Nthome Rides" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Your Nthome Receipt for Trip #${tripId}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #04a782;">Hi ${name || 'Rider'},</h2>
          <p>Thank you for riding with <strong>Nthome</strong>. Please find your trip receipt below:</p>
          <p><a href="${receiptUrl}" target="_blank" style="color: #04a782;">Download your receipt (PDF)</a></p>
          <p style="margin-top:20px;">If you have any questions, feel free to reply to this email.</p>
          <p style="color: #999; font-size: 13px;">Nthome - Making every ride special for you 🚗</p>
        </div>
      `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: '✅ Receipt email sent successfully' });
    } catch (err) {
        console.error('❌ Error sending receipt email:', err);
        res.status(500).json({ message: 'Error sending receipt email', error: err.message });
    }
});

module.exports = router;
