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

let state = {
  waitForUserInfo: false,
  waitForDeleteById: false,
  waitForDeleteAllConfirm: false
};

const keyboards = {
  main: {
    keyboard: [["Status"], ["User haqida"], ["Database ni tozalash"]],
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

async function sendStart(chatId) {
  await api("sendMessage", {
    chat_id: chatId,
    text: `<b>DevCore tizimiga xush kelibsiz.</b>\n\nSizning ID raqamingiz:`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ 
        text: "ID ni nusxalash", 
        copy_text: { text: chatId.toString() } 
      }]]
    }
  });
}

function getStatus() {
  const uptime = Math.floor((Date.now() - serverStartTime) / 60000);
  return `Батя батя, это отчёт сервера\n\nUptime: ${uptime} daqiqa\nDB: ${mongoose.connection.readyState === 1 ? "OK" : "DISCONNECT"}\nHost: ${os.hostname()}\nRAM: ${(os.freemem() / 1024**3).toFixed(2)} / ${(os.totalmem() / 1024**3).toFixed(2)} GB`;
}

async function listen() {
  try {
    const res = await axios.get(`${TG_URL}/getUpdates`, {
      params: { offset: lastUpdateId + 1, timeout: 30 }
    });

    for (const upd of res.data.result) {
      lastUpdateId = upd.update_id;
      if (!upd.message) continue;

      const chatId = upd.message.chat.id;
      const text = upd.message.text;

      if (text === "/start") {
        await sendStart(chatId);
        continue;
      }

      if (String(chatId) !== ADMIN_ID) {
        await api("sendMessage", { chat_id: chatId, text: "⛔ Ruxsat yo‘q." });
        continue;
      }

      if (text === "Status") {
        await api("sendMessage", { chat_id: chatId, text: getStatus(), reply_markup: keyboards.main });
      } else if (text === "User haqida") {
        state.waitForUserInfo = true;
        await api("sendMessage", { chat_id: chatId, text: "Telegram ID kiriting:", reply_markup: keyboards.main });
      } else if (text === "Database ni tozalash") {
        await api("sendMessage", { chat_id: chatId, text: "Tanlang:", reply_markup: keyboards.delete });
      } else if (text === "Telegram ID orqali") {
        state.waitForDeleteById = true;
        await api("sendMessage", { chat_id: chatId, text: "ID kiriting:", reply_markup: keyboards.main });
      } else if (text === "Barcha ma’lumotlarni") {
        state.waitForDeleteAllConfirm = true;
        await api("sendMessage", { chat_id: chatId, text: "⚠️ Rostdan o‘chirilsinmi?", reply_markup: keyboards.confirm });
      } else if (text === "HA, hammasini o‘chir" && state.waitForDeleteAllConfirm) {
        const resDel = await User.deleteMany({});
        state.waitForDeleteAllConfirm = false;
        await api("sendMessage", { chat_id: chatId, text: `⚠️ Tozalandi. Soni: ${resDel.deletedCount}`, reply_markup: keyboards.main });
      } else if (text === "❌ Bekor qilish" || text === "⬅️ Orqaga") {
        Object.keys(state).forEach(k => state[k] = false);
        await api("sendMessage", { chat_id: chatId, text: "Asosiy menyu", reply_markup: keyboards.main });
      } else if (/^\d+$/.test(text)) {
        if (state.waitForUserInfo) {
          const user = await User.findOne({ TelegramId: text });
          const msg = user ? `USER: ${user.Name}\nEmail: ${user.Email}\nPhone: ${user.Phone}` : "❌ Topilmadi.";
          state.waitForUserInfo = false;
          await api("sendMessage", { chat_id: chatId, text: msg, reply_markup: keyboards.main });
        } else if (state.waitForDeleteById) {
          const del = await User.findOneAndDelete({ TelegramId: text });
          state.waitForDeleteById = false;
          await api("sendMessage", { chat_id: chatId, text: del ? "✅ O‘chirildi" : "❌ Topilmadi", reply_markup: keyboards.main });
        }
      }
    }
  } catch (err) {
    console.error("Loop error:", err.message);
  }
  setTimeout(listen, 1000);
}

listen();
