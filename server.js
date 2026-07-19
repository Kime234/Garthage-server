const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/api/stats', (req, res) => {
  res.json({
    activeUsers: Math.floor(Math.random() * 2000) + 10000,
    views: Math.floor(Math.random() * 100000) + 500000,
    likes: Math.floor(Math.random() * 50000) + 200000,
    coins: Math.floor(Math.random() * 20000) + 50000
  })
});

app.listen(PORT, () => {
  console.log(`✅ سيرفر قرطاج خادم على المنفذ ${PORT}`);
});
git clone https://github.com/Kime/Garthage-server.git
cd Garthage-server
npm install
node server.js
