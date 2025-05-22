// index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fetch from "node-fetch";
import os from "os";
import { SUPABASE_API_URL, API_KEY } from "./config/config.js";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  const ip = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
  console.log(`✅ 사용자 접속 (IP: ${ip})`);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`📡 ${socket.id} joined room ${roomId}`);
  });

  socket.on("sendMessage", async (msg) => {
    try {
      const res = await fetch(`${SUPABASE_API_URL}/rest/v1/messages`, {
        method: "POST",
        headers: {
          apikey: API_KEY,
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify([
          {
            room_id: msg.room_id,
            sender: msg.sender,
            content: msg.content,
          },
        ]),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "메시지 저장 실패");

      io.to(msg.room_id).emit("newMessage", data[0]);
    } catch (err) {
      console.error("❌ 메시지 저장 실패", err.message);
    }
  });
});

// ✅ 서버 실행 및 내부/외부 IP 주소 출력
server.listen(3001, () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  console.log("🚀 Socket server running!");
  console.log(`📡 Local:   http://localhost:3001`);
  addresses.forEach((addr) =>
    console.log(`📡 Network: http://${addr}:3001`)
  );
});
