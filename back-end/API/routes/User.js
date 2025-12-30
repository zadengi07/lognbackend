require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../model/UserSchema");
const Auth = require("../middleware/Authorization");

/* ======================
    UTILITIES
====================== */
router.get("/ping", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});


// 1. Send OTP via Telegram
router.post("/send-verify", async (req, res) => {
    try {
        const { TelegramId } = req.body;
        if (!TelegramId) return res.status(400).json({ error: "Telegram ID talab qilinadi" });

        let user = await User.findOne({ TelegramId });

        if (user && user.Password && user.IsVerified) {
            return res.status(400).json({ error: "Siz allaqachon ro'yxatdan o'tgansiz. Iltimos, login qiling." });
        }

        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 60 * 1000; 

        const token = process.env.BOT_API;
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: TelegramId,
            text: `Tasdiqlash kodi: <b>${verifyCode}</b>`,
            parse_mode: "HTML"
        });

        if (!user) user = new User({ TelegramId });

        user.VerificationCode = verifyCode;
        user.CodeExpires = expires;
        user.IsVerified = false;
        await user.save();
        
        res.status(200).json({ success: true, message: "Kod yuborildi" });
    } catch (err) {
        res.status(500).json({ error: "Server xatosi" });
    }
});

// 2. Verify OTP
router.post("/id-verify", async (req, res) => {
    try {
        const { TelegramId, Code } = req.body;
        const user = await User.findOne({ TelegramId });

        if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

        if (user.VerificationCode !== Code.toString().trim()) {
            return res.status(400).json({ error: "Kod noto'g'ri" });
        }

        if (Date.now() > user.CodeExpires) {
            return res.status(400).json({ error: "Kodning vaqti o'tgan" });
        }

        user.IsVerified = true;
        user.VerificationCode = null; 
        await user.save();

        res.status(200).json({ success: true, message: "Kod tasdiqlandi" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Complete Registration
router.post("/register", async (req, res) => {
    try {
        const { TelegramId, Name, Email, Password, Phone, Yonalish, Institute } = req.body;
        const user = await User.findOne({ TelegramId });

        if (!user || !user.IsVerified) {
            return res.status(400).json({ error: "Avval Telegram orqali tasdiqlang!" });
        }

        const salt = await bcrypt.genSalt(10);
        user.Password = await bcrypt.hash(Password, salt);
        user.Name = Name;
        user.Email = Email;
        user.Phone = Phone;
        user.Yonalish = Yonalish;
        user.Institute = Institute;
        user.VerificationCode = undefined;
        user.CodeExpires = undefined;

        await user.save();

        try {
            const botToken = process.env.BOT_API;
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: TelegramId,
                text: `<b>Tabriklaymiz, ${Name}!</b>\nRo'yxatdan o'tdingiz.`,
                parse_mode: "HTML"
            });
        } catch (e) { console.log("Bot error ignored"); }

        const token = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN, { expiresIn: "1d" });
        res.status(201).json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Serverda xatolik" });
    }
});

/* ======================
    LOGIN & PROFILE
====================== */
router.post("/login", async (req, res) => {
    try {
        const { TelegramId, Password } = req.body;
        const user = await User.findOne({ TelegramId });

        if (!user || !user.Password) {
            return res.status(400).json({ error: "Foydalanuvchi topilmadi" });
        }

        const isMatch = await bcrypt.compare(Password, user.Password);
        if (!isMatch) return res.status(400).json({ error: "Parol noto'g'ri" });

        const token = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN, { expiresIn: "1d" });

        try {
            await axios.post(`https://api.telegram.org/bot${process.env.BOT_API}/sendMessage`, {
                chat_id: TelegramId,
                text: `<b>Diqqat!</b>\nHisobingizga kirildi.`,
                parse_mode: "HTML"
            });
        } catch (e) {}

        res.status(200).json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Serverda xatolik" });
    }
});

router.get("/profile", Auth, (req, res) => {
    res.status(200).json({ success: true, userInfo: req.user });
});

router.post("/logout", (req, res) => {
    res.json({ message: "Tokenni client tomondan o'chiring" });
});

/* ======================
    DELETE
====================== */
router.delete("/delete", Auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "Topilmadi" });

        const { TelegramId, Name } = user;
        await User.findByIdAndDelete(req.user.id);

        try {
            await axios.post(`https://api.telegram.org/bot${process.env.BOT_API}/sendMessage`, {
                chat_id: TelegramId,
                text: `<b>Xayr, ${Name}!</b>\nAkauntingiz o'chirildi.`,
                parse_mode: "HTML"
            });
        } catch (e) {}

        res.json({ success: true, message: "O'chirildi" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;