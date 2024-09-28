// DotENV
import "dotenv/config";

// Express, Next, Socket.IO, etc...
import express from "express";
import next from "next";
import http from "http";
import { Server as socketIo } from "socket.io";
import cors from "cors";

// Database
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Initialization
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
import * as nodeCrypto from "crypto";
const handle = nextApp.getRequestHandler();

const app = express();

let db;
(async () => {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });
})();

(async () => {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });
  await db.exec(`CREATE TABLE IF NOT EXISTS account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    token TEXT
  )`);
})();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    optionsSuccessStatus: 200,
  }),
);
app.use(express.json());

app.post("/api/checktoken", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  const account = await db.get(`SELECT username FROM account WHERE token = ?`, [
    token,
  ]);

  if (account) {
    res.status(200).json({ message: "Token is valid" });
  } else {
    res.status(401).json({ message: "Token is invalid" });
  }
});

app.post("/api/login", async (req, res) => {
  const data = req.body;
  let username = data.username;

  console.log(`Login request from ${req.ip} as ${username}`);
  if (!new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
    res
      .status(400)
      .send(
        "Username must be 3-16 characters long and contain only letters and numbers",
      );
    return;
  }
  let password = data.password;
  if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
    res.status(400).send("Password must contain only letters and numbers");
    return;
  }

  let passwordHash = nodeCrypto.createHash("sha512").update(password).digest("hex");

  const account = await db.get(`SELECT * FROM account WHERE username = ?`, [
    username,
  ]);

  if (account) {
    if (passwordHash === account.passwordHash) {
      if (account.token === null) {
        let token = nodeCrypto.randomBytes(16).toString("hex");
        await db.run(`UPDATE account SET token = ? WHERE username = ?`, [
          token,
          username,
        ]);
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

app.post("/api/register", async (req, res) => {
  const data = req.body;

  let username = data.username;
  let password = data.password;

  console.log(`Register request from ${req.ip} as ${username}`);
  if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
    res.status(400).send("Password must contain only letters and numbers");
    return;
  }

  if (new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
    const account = await db.get(`SELECT * FROM account WHERE username = ?`, [
      username,
    ]);
    if (account) {
      res.status(409).send("Username already exists");
    } else {
      let passwordHash = nodeCrypto.createHash("sha512").update(password).digest("hex");
      await db.run(
        `INSERT INTO account (username, passwordHash, token) VALUES (?, ?, NULL)`,
        [username, passwordHash],
      );
      res.status(200).send("Account created");
    }
  } else {
    res
      .status(400)
      .send(
        "Username must be 3-16 characters long and contain only letters and numbers",
      );
  }
});

nextApp.prepare().then(() => {
  const server = http.createServer(app);
  const io = new socketIo(server);

  /**
   * Handles a new socket connection.
   *
   * @param socket - The socket instance representing the connection.
   *
   * This function sets up event listeners for the following events:
   * - "connectionPing": Verifies the provided token and announces the connection if valid.
   * - "message": Validates and sanitizes incoming messages, then broadcasts them if the token is valid.
   *
   * Events:
   * - "connectionPing": Expects a token and verifies it against the database. If valid, announces the connection.
   * - "message": Expects an object with `token` and `message` properties. Validates and sanitizes the message, then broadcasts it if the token is valid.
   *
   * Error Handling:
   * - Logs any errors encountered during database queries.
   * - Emits an error event if the token is invalid or if there are issues parsing the token.
   */
  const onConnection = (socket) => {
    console.log(`User ${socket.handshake.address} connected`);

    socket.on("connectionPing", async (token) => {
      try {
        const account = await db.get(`SELECT * FROM account WHERE token = ?`, [
          token,
        ]);
        if (account) {
          io.emit("announcement", `${account.username} has connected!`);
        }
      } catch (error) {
        console.error("Error executing query:", error);
      }
    });

    socket.on("message", async (message) => {
      if (!message || !message.token || !message.message) {
        console.log("Invalid message received:", message);
        socket.emit("announcement", "Invalid message/token received");
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
        const account = await db.get(`SELECT * FROM account WHERE token = ?`, [
          token,
        ]);
        if (account) {
          io.emit("message", `${account.username}: ${content}`);
        } else {
          io.emit("error", JSON.stringify({ logout: true }));
        }
      } catch (error) {
        console.error("Error executing query:", error);
      }
    });
  };

  io.on("connection", onConnection);

  app.all("*", (req, res) => handle(req, res));

  let port = process.env.SERVER_PORT || 80;

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });

  process.on("SIGINT", () => {
    io.off("connection", onConnection);
    server.close();
    process.exit();
  });
});
