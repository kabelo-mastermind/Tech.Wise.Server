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
   <!-- Modern Nthome Trip Receipt Email Template -->
            <div style="
                max-width:480px;
                margin:24px auto;
                background:#fff;
                border-radius:16px;
                box-shadow:0 4px 24px rgba(4,167,130,0.09);
                font-family:'Segoe UI',Arial,sans-serif;
                padding:40px 28px 32px 28px;
            ">
            <div style="text-align:center; margin-bottom:28px;">
                <img src="https://firebasestorage.googleapis.com/v0/b/voice-recording-app-2ed9b.appspot.com/o/profile_pictures%2FBobo_18%2F026006a4-65cc-4ffb-b283-b7c98eb17f31.png?alt=media&token=b24b7460-c04b-42e7-91a6-328d55121f00" alt="Nthome Logo" style="width:60px; border-radius:12px; box-shadow:0 1px 6px rgba(4,167,130,.12);" />
                <h2 style="color:#04a782; font-weight:700; font-size:28px;margin:20px 0 10px;">Hi ${name || 'Rider'},</h2>
            </div>
            <p style="font-size:18px; line-height:1.5; color:#222; margin:0 0 20px;">
                Thank you for riding with <strong style="color:#04a782;">Nthome</strong>.<br>Your trip receipt is ready!
            </p>
            <div style="text-align:center;">
                <a href="${receiptUrl}" target="_blank"
                style="display:inline-block; background:#04a782; color:#fff; font-size:18px; font-weight:600; text-decoration:none; border-radius:8px; padding:16px 36px; margin:22px 0; box-shadow:0 2px 8px rgba(4,167,130,.06); transition: background 0.2s;">
                &#128190; Download your Receipt (PDF)
                </a>
            </div>
            <p style="font-size:16px; color:#222; margin:32px 0 10px 0;">
                Have questions? Just reply to this email, we're here to help!
            </p>
            <hr style="border:none; border-top:1px solid #eee; margin:36px 0 22px;" />
            <footer style="font-size:13px; color:#aaa; text-align:center;">
                Nthome &mdash; Making every ride special for you <span style="font-size:16px;">🚗</span><br/>
                <span style="color:#ddd;">|</span> <a href="https://yourdomain.com" style="color:#04a782; text-decoration:none;">Visit our website</a>
            </footer>
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
