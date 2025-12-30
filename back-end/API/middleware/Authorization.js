const jwt = require("jsonwebtoken");
const User = require("../model/UserSchema");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Token borligini tekshirish
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];
    
    // 2. Tokenni decode qilish
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

    // 3. Foydalanuvchini bazadan qidirish
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: "User no longer exists"
      });
    }

    // 4. Adminlikni tekshirish (CHAT_ID orqali)
    // .env dagi CHAT_ID sizning Telegram IDingizga teng bo'lsa admin bo'ladi
    const isAdmin = user.TelegramId.toString() === process.env.CHAT_ID.toString();

    // 5. req.user ob'ektini shakllantirish
    req.user = {
      id: user._id,
      Name: user.Name,
      Email: user.Email,
      TelegramId: user.TelegramId,
      Phone: user.Phone,
      Yonalish: user.Yonalish,
      Institute: user.Institute,
      // Agar admin bo'lsa 'admin', bo'lmasa 'user' roli beriladi
      role: isAdmin ? "admin" : "user" 
    };

    next();
  } catch (err) {
    console.error("Authorization Error:", err.message);
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
};