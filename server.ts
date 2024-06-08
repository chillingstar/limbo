// DotENV
const dotenv = require("dotenv");
dotenv.config();

// Express, Next, Socket.IO, etc...
const express = require("express");
const next = require("next");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

// Database
const mysql = require("mysql2");
const mongoose = require("mongoose");

// Initialization
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const nodeCrypto = require("node:crypto");

const api = express();

let pool, Account;

api.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    optionsSuccessStatus: 200,
  })
);
api.use(express.json());

switch ((process.env.DATABASE).toLowerCase()) {
  case "mongodb":
    console.log("Using MongoDB.");
    async function ConnectMongoDB() {
      await mongoose.connect(
        `mongodb+srv://${encodeURIComponent(
          process.env.DB_USER
        )}:${encodeURIComponent(process.env.DB_PASSWORD)}@${
          process.env.DB_HOST
        }/?retryWrites=true&w=majority&appName=${process.env.DB_NAME}`,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      );
    }

    ConnectMongoDB();

    const db = mongoose.connection;

    db.on("error", console.error.bind(console, "connection error:"));
    db.once("open", function () {
      console.log("Connected to MongoDB");
    });

    const accountSchema = new mongoose.Schema({
      username: String,
      passwordHash: String,
      token: String,
      isAdmin: Boolean,
    });

    const AccountModel = mongoose.model("Account", accountSchema);
    if (process.env.DATABASE.toLowerCase() === "mongodb") {
      Account = AccountModel;
    }

    api.post("/api/login", async (req, res) => {
      const data = req.body;

      let username = data.username;
      if (!new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
        res
          .status(400)
          .send(
            "Username must be 3-16 characters long and contain only letters and numbers"
          );
        return;
      }

      let password = data.password;
      if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
        res.status(400).send("Password must contain only letters and numbers");
        return;
      }

      let passwordHash = nodeCrypto.hash(
        "sha256",
        nodeCrypto.hash("sha512", password)
      );

      let account = await Account.findOne({ username: username });

      if (account) {
        if (passwordHash === account.passwordHash) {
          if (account.token === null) {
            let token = nodeCrypto.randomBytes(16).toString("hex");
            account.token = token;
            await account.save();
            res.status(200).json({ token: token });
          } else {
            res.status(200).json({ token: account.token });
          }
        } else {
          res.status(401).send("Invalid password");
        }
      } else {
        res.status(404).send("Account not found");
      }
    });

    api.post("/api/register", async (req, res) => {
      const data = req.body;

      let username = data.username;
      let password = data.password;

      if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
        res.status(400).send("Password must contain only letters and numbers");
        return;
      }

      if (new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
        let account = await Account.findOne({ username: username });

        if (account) {
          res.status(409).send("Username already exists");
        } else {
          let passwordHash = nodeCrypto.hash(
            "sha256",
            nodeCrypto.hash("sha512", password)
          );
          let newAccount = new Account({
            username: username,
            passwordHash: passwordHash,
            token: null,
            isAdmin: false,
          });
          await newAccount.save();
          res.status(200).send("Account created");
        }
      } else {
        res
          .status(400)
          .send(
            "Username must be 3-16 characters long and contain only letters and numbers"
          );
      }
    });

    break;

  case "mysql":
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    api.post("/api/login", async (req, res) => {
      const data = req.body;

      let username = data.username;
      if (!new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
        res
          .status(400)
          .send(
            "Username must be 3-16 characters long and contain only letters and numbers"
          );
        return;
      }
      let password = data.password;
      if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
        res.status(400).send("Password must contain only letters and numbers");
        return;
      }

      let passwordHash = nodeCrypto.hash(
        "sha256",
        nodeCrypto.hash("sha512", password)
      );

      const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });

      const [rows] = await pool.query(
        "SELECT * FROM account WHERE username = ?",
        [username]
      );

      if (rows.length > 0) {
        let account = rows[0];

        if (passwordHash === account.passwordHash) {
          if (account.token === null) {
            let token = nodeCrypto.randomBytes(16).toString("hex");
            await pool.query(
              "UPDATE account SET token = ? WHERE username = ?",
              [token, username]
            );
            res.status(200).json({ token: token });
          } else {
            res.status(200).json({ token: account.token });
          }
        } else {
          res.status(401).send("Invalid password");
        }
      } else {
        res.status(404).send("Account not found");
      }
    });

    api.post("/api/register", async (req, res) => {
      const data = req.body;

      let username = data.username;
      let password = data.password;
      if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
        res.status(400).send("Password must contain only letters and numbers");
        return;
      }

      if (new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
        const [rows] = await pool.query(
          "SELECT * FROM account WHERE username = ?",
          [username]
        );
        if (rows.length > 0) {
          res.status(409).send("Username already exists");
        } else {
          let passwordHash = nodeCrypto.hash(
            "sha256",
            nodeCrypto.hash("sha512", password)
          );
          await pool.query(
            "INSERT INTO account (username, passwordHash, token, isAdmin) VALUES (?, ?, NULL, FALSE)",
            [username, passwordHash]
          );
          res.status(200).send("Account created");
        }
      } else {
        res
          .status(400)
          .send(
            "Username must be 3-16 characters long and contain only letters and numbers"
          );
      }
    });
    break;
  default:
    console.error("Invalid database selected");
    process.exit(1);
    break;
}

api.listen(process.env.API_PORT || 2323, () => {
  console.log(
    `> API ready on http://localhost:${process.env.API_PORT || 2323}`
  );
});

nextApp.prepare().then(() => {
  const app = express();

  const server = http.createServer(app);
  const io = new socketIo.Server(server);

  const onConnection = (socket) => {
    console.log(`User ${socket.handshake.address} connected`);
    io.emit("announcement", "An user has connected");

    socket.on("message", async (message) => {
      console.log("Received message:", message); // Log the received message

      if (!message || !message.token || !message.message) {
        console.log("Invalid message received:", message);
        socket.emit("announcement", "Invalid message received");
        return;
      }
      try {
        var token = JSON.parse(message.token).token;
      } catch {
        io.emit("error", JSON.stringify({ logout: true }));
        return;
      }
      let content = message.message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      try {
        if (process.env.DATABASE === "mongodb") {
          var account = await Account.findOne({ token });
        } else {
          var [rows] = await pool.query(
            "SELECT * FROM account WHERE token = ?",
            [token]
          );
          var account = rows[0];
        }
        if (account) {
          io.emit("message", `${account.username}: ${content}`);
        } else {
          io.emit("error", JSON.stringify({ logout: true }));
        }
      } catch (error) {
        console.error("Error executing query:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.handshake.address} disconnected`);
      io.emit("announcement", "An user has disconnected");
    });
  };

  io.on("connection", onConnection);

  app.all("*", (req, res) => handle(req, res));

  let port = process.env.SERVER_PORT || 80;

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
