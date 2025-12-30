require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path"); // Papka yo'llari bilan ishlash uchun
const UserApi = require("./API/routes/User");
const cors = require("cors");

const app = express();
app.use(cors());
// 1. DATABASE CONNECTION
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB ulandi"))
  .catch((err) => console.error("MongoDB ulanmadi:", err.message));

// 2. MIDDLEWARES
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 3. PUBLIC FOLDER (Statik fayllar uchun)
// Bu qator http://localhost:5000/ kirganda public ichidagi index.html ni ochadi
app.use(express.static(path.join(__dirname, "public")));

// 4. ROUTES
app.use("/api", UserApi);
app.use("/User", UserApi);

// 5. 404 HANDLER
// Eslatma: Bu har doim statik fayllar va routerlardan keyin kelishi shart
app.use((req, res) => {
  res.status(404).json({
    error: "Bad Request: URL not found",
  });
});

// 6. EXTERNAL MODULES
require("./bot");

module.exports = app;