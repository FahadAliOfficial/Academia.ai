// src/socket.js
import { io } from "socket.io-client";

// Connect to your running backend
const socket = io("http://localhost:3001", {
  transports: ["websocket"],
});

export default socket;
