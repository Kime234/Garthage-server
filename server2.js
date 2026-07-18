const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("✅ سيرفر قرطاج خادم");
});

// جيب اليوزرز
app.get("/api/users", (req, res) => {
  res.json([]);
});

// تسجيل يوزر جديد
app.post("/api/register", (req, res) => {
  res.json({ message: "User registered" });
});

// الاحصائيات
app.get("/api/stats", (req, res) => {
  res.json({
    activeUsers: Math.floor(Math.random() * 500) + 100,
    views: Math.floor(Math.random() * 10000) + 5000,
    likes: Math.floor(Math.random() * 2000) + 500,
    coins: Math.floor(Math.random() * 10000) + 1000
  });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
