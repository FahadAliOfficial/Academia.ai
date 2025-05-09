//run using node page.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = {};
// Serve static files (e.g., for the frontend)
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("a user connected");

  // Handle signaling messages for WebRTC (offer, answer, ICE candidates)
  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer); // Send offer to other users
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer); // Send answer to the initiator
  });

  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate); // Send ICE candidate to other users
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  // On server-side (example with socket.io)
  socket.on("join-room", ({ roomId, participant }) => {
    socket.join(roomId);
    rooms[roomId] = rooms[roomId] || [];
    rooms[roomId].push(participant);
    
    const isInitiator = rooms[roomId].length === 1;
    socket.emit("room-joined", { isInitiator }); // tell client if it should send offer

    io.to(roomId).emit("update-participants", rooms[roomId]);
    socket.to(roomId).emit("user-joined", participant); // 👈 emit this
  });

});

server.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});