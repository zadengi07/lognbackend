require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const os = require("os");
const User = require("./API/model/UserSchema");

const BOT_TOKEN = process.env.BOT_API;
const ADMIN_ID = String(process.env.CHAT_ID);
const TG_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

let lastUpdateId = 0;
const serverStartTime = Date.now();

// --- YANGI STATE VA PARAMETRLAR ---
let reportInterval = 60; // default 60 minut
let lastReportTime = Date.now();
let state = {
  waitForUserInfo: false,
  waitForDeleteById: false,
  waitForDeleteAllConfirm: false,
  waitForIntervalSet: false // yangi state
};

const keyboards = {
  main: {
    keyboard: [["Status", "Set Status"], ["User haqida"], ["Database ni tozalash"]],
    resize_keyboard: true
  },
  delete: {
    keyboard: [["Telegram ID orqali"], ["Barcha ma’lumotlarni"], ["⬅️ Orqaga"]],
    resize_keyboard: true
  },
  confirm: {
    keyboard: [["HA, hammasini o‘chir"], ["❌ Bekor qilish"]],
    resize_keyboard: true
  }
};

async function api(method, data) {
  try {
    return await axios.post(`${TG_URL}/${method}`, data);
  } catch (err) {
    console.error(`API Error (${method}):`, err.message);
  }
}

function getStatus() {
  const uptime = Math.floor((Date.now() - serverStartTime) / 60000);

  return `<b>Батя батя, это отчёт сервера</b>\n\n` +
         `Аптайм: ${uptime} минут\n` +
         `Интервал отчёта: ${reportInterval} минут\n` +
         `База данных: ${mongoose.connection.readyState === 1 ? "OK" : "ОТКЛЮЧЕНА"}\n` +
         `Хост: ${os.hostname()}\n` +
         `Оперативная память: ${(os.freemem() / 1024**3).toFixed(2)} / ${(os.totalmem() / 1024**3).toFixed(2)} GB`;
}


// --- AVTOMATIK HISOBOT FUNKSIYASI ---
async function checkAutoReport() {
  const now = Date.now();
  const diffInMinutes = Math.floor((now - lastReportTime) / 60000);

  if (diffInMinutes >= reportInterval) {
    lastReportTime = now;
    await api("sendMessage", { 
      chat_id: ADMIN_ID, 
      text: `Автоматический отчет\n\n${getStatus()}`,
      reply_markup: keyboards.main 
    });
  }
}

async function listen() {
  try {
    // Har bir tsiklda avtomatik hisobot vaqtini tekshirish
    await checkAutoReport();

    const res = await axios.get(`${TG_URL}/getUpdates`, {
      params: { offset: lastUpdateId + 1, timeout: 20 }
    });

    for (const upd of res.data.result) {
      lastUpdateId = upd.update_id;
      if (!upd.message) continue;

      const chatId = upd.message.chat.id;
      const text = upd.message.text;

      if (text === "/start") {
        await api("sendMessage", { chat_id: chatId, text: `Sizning ID: ${chatId}`, reply_markup: keyboards.main });
        continue;
      }

      if (String(chatId) !== ADMIN_ID) {
        await api("sendMessage", { chat_id: chatId, text: "⛔ Ruxsat yo‘q." });
        continue;
      }

      // --- ASOSIY BUYRUQLAR ---
      if (text === "Status") {
        await api("sendMessage", { chat_id: chatId, text: getStatus(), reply_markup: keyboards.main });
      } 
      
      else if (text === "Set Status") {
        state.waitForIntervalSet = true;
        await api("sendMessage", { 
          chat_id: chatId, 
          text: `Iltimos, hisobot topshirish oralig'ini minutlarda kiriting:\n(Hozirgi holat: ${reportInterval} minut)`, 
          reply_markup: keyboards.main 
        });
      }

      else if (text === "User haqida") {
        state.waitForUserInfo = true;
        await api("sendMessage", { chat_id: chatId, text: "Telegram ID kiriting:" });
      }
      else if (text === "Database ni tozalash") {
        await api("sendMessage", { chat_id: chatId, text: "Tanlang:", reply_markup: keyboards.delete });
      }

      // --- RAQAMLI KIRISHLARNI QAYTA ISHLASH ---
      else if (/^\d+$/.test(text)) {
        if (state.waitForIntervalSet) {
          reportInterval = parseInt(text);
          lastReportTime = Date.now(); // Taymerni yangilash
          state.waitForIntervalSet = false;
          await api("sendMessage", { 
            chat_id: chatId, 
            text: `✅ Tayyor! Endi har ${reportInterval} minutda hisobot yuboraman.`, 
            reply_markup: keyboards.main 
          });
        } 
        else if (state.waitForUserInfo) {
          const user = await User.findOne({ TelegramId: text });
          const msg = user ? `USER: ${user.Name}\nEmail: ${user.Email}\nPhone: ${user.Phone}` : "❌ Topilmadi.";
          state.waitForUserInfo = false;
          await api("sendMessage", { chat_id: chatId, text: msg, reply_markup: keyboards.main });
        } 
        else if (state.waitForDeleteById) {
          const del = await User.findOneAndDelete({ TelegramId: text });
          state.waitForDeleteById = false;
          await api("sendMessage", { chat_id: chatId, text: del ? "✅ O‘chirildi" : "❌ Topilmadi", reply_markup: keyboards.main });
        }
      }

      // --- BOSHQA AMALLAR ---
      else if (text === "Barcha ma’lumotlarni") {
        state.waitForDeleteAllConfirm = true;
        await api("sendMessage", { chat_id: chatId, text: "⚠️ Rostdan o‘chirilsinmi?", reply_markup: keyboards.confirm });
      } 
      else if (text === "HA, hammasini o‘chir" && state.waitForDeleteAllConfirm) {
        const resDel = await User.deleteMany({});
        state.waitForDeleteAllConfirm = false;
        await api("sendMessage", { chat_id: chatId, text: `⚠️ Tozalandi. Soni: ${resDel.deletedCount}`, reply_markup: keyboards.main });
      } 
      else if (text === "❌ Bekor qilish" || text === "⬅️ Orqaga") {
        Object.keys(state).forEach(k => state[k] = false);
        await api("sendMessage", { chat_id: chatId, text: "Asosiy menyu", reply_markup: keyboards.main });
      }
    }
  } catch (err) {
    console.error("Loop error:", err.message);
  }
  setTimeout(listen, 1000);
}

listen();