const express = require("express");
const next = require("next");
const http = require("http");
const socketIo = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/test", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

nextApp.prepare().then(() => {
  const app = express();

  const server = http.createServer(app);
  const io = new socketIo.Server(server);

  const onConnection = (socket) => {
    console.log(`User ${socket.handshake.address} connected`);
    io.emit("announcement", "An user has connected");

    socket.on("message", (message) => {
      console.log(
        `Message received from ${socket.handshake.address}: ${message}`,
      );
      socket.broadcast.emit("message", message);
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.handshake.address} disconnected`);
      io.emit("announcement", "An user has disconnected");
    });
  };

  io.on("connection", onConnection);

  app.all("*", (req, res) => handle(req, res));

  let port = 80;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });

  process.on("SIGINT", () => {
    io.off("connection", onConnection);
    server.close();
    process.exit();
  });
});
