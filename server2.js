const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ سيرفر قرطاج خادم");
});

app.get("/api/users", (req, res) => {
  res.json([]);
});

app.post("/api/register", (req, res) => {
  res.json({ message: "User registered" });
});

app.get("/api/stats", (req, res) => {
  res.json({
    activeUsers: Math.floor(Math.random() * 100),
    views: Math.floor(Math.random() * 1000),
    likes: Math.floor(Math.random() * 500),
    coins: Math.floor(Math.random() * 200)
  })
});

app.listen(PORT, () => {
  console.log(`✅ سيرفر قرطاج خادم على المنفذ ${PORT}`);
});
