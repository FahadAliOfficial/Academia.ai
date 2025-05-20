// src/socket.js
import { io } from "socket.io-client";

// Create a socket with improved reconnection options
const socket = io("http://localhost:3001", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true
});

// Add event listeners to handle connection issues
socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log("Socket reconnection attempt:", attempt);
});

socket.on("reconnect", (attempt) => {
  console.log("Socket reconnected after", attempt, "attempts");
});

socket.on("reconnect_error", (error) => {
  console.error("Socket reconnection error:", error);
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});

// Helper function to check if socket is connected and reconnect if not
export const ensureSocketConnected = () => {
  if (!socket.connected) {
    console.log("Socket not connected, reconnecting...");
    socket.connect();
    return false;
  }
  return true;
};

export default socket;
