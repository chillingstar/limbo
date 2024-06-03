const express = require("express");
const next = require("next");
const socketIo = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  const server = require("http").createServer(app);
  const io = socketIo(server);

  io.on("connection", (socket) => {
    console.log(`User ${socket.handshake.address} connected`);

    socket.on("message", (message) => {
      console.log(
        `Message received from ${socket.handshake.address}: ${message}`,
      );
      io.emit("message", message);
    });

    socket.on("log", (message) => {
      console.log(`Log message from ${socket.handshake.address}: ${message}`);
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.handshake.address} disconnected`);
    });
  });

  app.all("*", (req, res) => handle(req, res));

  server.listen(80, (err) => {
    if (err) throw err;
    console.log("> Ready on http://localhost");
  });
});
