const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    // Name, Email va Password birinchi bosqichda shart emas (required: false)
    // Chunki bular faqat /register bosqichida keladi
    Name: { type: String },
    Email: { type: String, unique: true, sparse: true }, // sparse: true - bo'sh email bo'lsa xato bermaydi
    Password: { type: String },
    
    // TelegramId har doim shart
    TelegramId: { type: String, required: true, unique: true },
    
    // Tasdiqlash maydonlari
    VerificationCode: { type: String },
    CodeExpires: { type: Date },
    IsVerified: { type: Boolean, default: false },
    
    Phone: { type: String },
    Yonalish: { type: String },
    Institute: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);