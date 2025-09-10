const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "frontend")));

// Socket.io test
io.on("connection", (socket) => {
  console.log("⚡ New client connected");
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});

// Catch-all route: serve index.html for any unknown route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ IsmisTube backend running on port ${PORT}`);
});
