const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Basic route
app.get("/", (req, res) => {
  res.send("🎬 IsmisTube backend is live on Render!");
});


// Socket.io test
io.on("connection", (socket) => {
  console.log("⚡ New client connected");
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ IsmisTube backend running on port ${PORT}`);
});
