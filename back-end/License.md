1. Tasdiqlash bosqichi (Verification)
POST /send-verify: Foydalanuvchi tizimga Telegram ID sini kiritadi. Server tasodifiy 6 xonali kod yaratadi, uni bazaga saqlaydi va Telegram bot orqali foydalanuvchiga yuboradi.

POST /id-verify: Foydalanuvchi botdan kelgan kodni qayta yuboradi. Server kodni bazadagisi bilan solishtiradi. Agar to'g'ri bo'lsa, foydalanuvchiga ro'yxatdan o'tishga "yashil chiroq" (IsVerified: true) yoqadi.

2. Ro'yxatdan o'tish va Kirish (Auth)
POST /register: Foydalanuvchi to'liq ma'lumotlarini (ism, email, parol va h.k.) yuboradi. Server parolni shifrlaydi (bcrypt) va ma'lumotlarni bazaga saqlaydi. Yakunda bot orqali "Tabriklaymiz" xabarini yuboradi va JWT token beradi.

POST /login: Foydalanuvchi Telegram ID va paroli bilan kiradi. Server parolni tekshiradi va unga keyingi so'rovlar uchun "elektron kalit" (JWT token) taqdim etadi. Bot kirish haqida bildirishnoma yuboradi.

3. Shaxsiy ma'lumotlar va Chiqish
GET /profile: Bu router "yopiq" hudud. Faqat qo'lida haqiqiy JWT tokeni bor foydalanuvchigina o'z ma'lumotlarini ko'ra oladi.

POST /logout: Tizimdan chiqish. Aslida bu mijoz (front-end) tomonda tokenni o'chirish bilan amalga oshadi.

4. Hisobni boshqarish va Test
DELETE /delete: Foydalanuvchi o'z hisobini o'chiradi. Server uni bazadan topadi, o'chiradi va bot orqali xayrlashuv xabarini yuboradi.

GET /ping: Serverning ishlab turganini tekshirish uchun kichik test yo'li.