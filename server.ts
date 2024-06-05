const settings = require("./settings.json");

const express = require("express");
const next = require("next");
const http = require("http");
const socketIo = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const crypt = require('node:crypto');
const mongoose = require('mongoose');

mongoose.connect(settings.mongoURI, {});

const api = express()
api.use(express.json())

const Account = mongoose.model('account', new mongoose.Schema({
  username: String,
  passwordHash: String,
  token: String,
  isAdmin: Boolean,
}))

api.post('/api/login', async (req, res) => {
  const data = req.body;

  let username = data.username;
  let password = data.password;

  let passwordHash = crypt.hash('sha256', (crypt.hash('sha512', password)));
  
  let account = await Account.findOne({ username: username });

  if (passwordHash === account.passwordHash.toString()) {
    if (account.token === null) {
      let token = crypt.generateBytes(128).digest('hex');
      account.token = token;
      account.save();
      res.status(200).json({ token: token });
    } else {
      res.status(200).json({ token: account.token });
    }
  } else {
    res.status(401).send('Invalid username or password');
  }
});

api.post('/api/register', async (req, res) => {
  const data = req.body;

  console.log(data);

  let username = data.username;
  let password = data.password;

  if (new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)){
    if (await Account.findOne({ username: username})) {
      res.status(409).send('Username already exists');
    } else {
      let passwordHash = crypt.hash('sha256', (crypt.hash('sha512', password)));
      let account = new Account({
        username: username,
        passwordHash: passwordHash,
        token: null,
        isAdmin: false,
      });
      account.save();
      res.status(201).send('Account created');
    }
  } else {
    res.status(400).send("Username must be 3-16 characters long and contain only letters and numbers");
  }
  
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

  let port = 2121;

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
