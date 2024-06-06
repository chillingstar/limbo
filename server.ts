const settings = require("./settings.json");

const express = require("express");
const next = require("next");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require('mysql2/promise');

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const crypt = require('node:crypto');

const api = express()
api.use(express.json())

const pool = mysql.createPool({
  host: settings.MySQL.host,
  user: settings.MySQL.user,
  password: settings.MySQL.password,
  database: settings.MySQL.database,
});

api.post('/api/login', async (req, res) => {
  const data = req.body;

  let username = data.username;
  let password = data.password;

  let passwordHash = crypt.hash('sha256', (crypt.hash('sha512', password)));

  const [rows] = await pool.query('SELECT * FROM account WHERE username = ?', [username]);

  if (rows.length > 0) {
    let account = rows[0];

    if (passwordHash === account.passwordHash) {
      if (account.token === null) {
        let token = crypt.generateBytes(128).digest('hex');
        await pool.query('UPDATE account SET token = ? WHERE username = ?', [token, username]);
        res.status(200).json({ token: token });
      }
    }
  }
});

api.post('/api/register', async (req, res) => {
  const data = req.body;

  let username = data.username;
  let password = data.password;

  if (new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)){
    const [rows] = await pool.query('SELECT * FROM account WHERE username = ?', [username]);
    if (rows.length > 0) {
      res.status(409).send('Username already exists');
    } else {
      let passwordHash = crypt.hash('sha256', (crypt.hash('sha512', password)));
      await pool.query('INSERT INTO account (username, passwordHash, token, isAdmin) VALUES (?, ?, NULL, FALSE)', [username, passwordHash]);
      res.status(200).send('Account created');
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
