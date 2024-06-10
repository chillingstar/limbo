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
const mysql = require("mysql2/promise");
const mongoose = require("mongoose");

// Initialization
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nodeCrypto = require("node:crypto");
const handle = nextApp.getRequestHandler();

const app = express();

let pool;
let Account;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

switch (process.env.DATABASE.toLowerCase()) {
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
      isBanned: Boolean,
    });

    const AccountModel = mongoose.model("Account", accountSchema);
    if (process.env.DATABASE.toLowerCase() === "mongodb") {
      Account = AccountModel;
    }

    app.post("/api/checktoken", async (req, res) => {
      console.log(`Token check from ${req.ip}`);
      const data = req.body;
      let token = data.token;

      if (!token) {
        res.status(400).send("No token provided");
        return;
      }

      let account = await Account.findOne({ token: token });

      if (account) {
        res.status(200).send("Token is valid");
      } else {
        res.status(401).send("Token is invalid");
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
          if (account.isBanned) { 
            res.status(403).send("You are banned from the server.");
            return;
          }

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
    console.log("Using MySQL.");

    let connection;

    async function ConnectMySQL() {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      try {
        await connection.connect();
        console.log("Connected to MySQL");
      } catch (error) {
        console.error("Error connecting to MySQL:", error);
      }
    }

    ConnectMySQL();

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    app.post("/api/checktoken", async (req, res) => {
      console.log(`Token check from ${req.ip}`);
      const token = req.body;

      if (!token) {
        res.status(400).send("No token provided");
        return;
      }

      const [rows] = await pool.query(
        `SELECT username FROM account WHERE token = "${token}";`
      );

      console.log(rows);

      if (rows.length > 0) {
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
            "INSERT INTO account (username, passwordHash, token, isAdmin, isBanned) VALUES (?, ?, NULL, FALSE, FALSE)",
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

nextApp.prepare().then(() => {
  const server = http.createServer(app);
  const io = new socketIo.Server(server);

  const onConnection = (socket) => {
    console.log(`User ${socket.handshake.address} connected`);
    
    socket.on("connectionPing", async (token) => {
      try {
        if (process.env.DATABASE === "mongodb") {
          var account = await Account.findOne({ token });
        }
        else {
          var [rows] = await pool.query("SELECT * FROM account WHERE token = ?", [token]);
          var account = rows[0];
        }
        if (account) {
          io.emit("announcement", `${account.username} has connected!`);
        }
      } catch (error) {
        console.error("Error executing query:", error);
      }
    })

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
          if (account.isAdmin) {
            io.emit("adminMessage", `${account.username}: ${content}`);

            if (content.startsWith("?ban")) {
              let username = content.split(" ")[1];
              if (username) {
                if (process.env.DATABASE === "mongodb") {
                  let target = await Account.findOne({ username: username });
                  if (target.isAdmin) {
                    socket.emit("announcement", "You cannot ban another admin");
                    return;
                  }
                  await Account.updateOne({ username: username }, { isBanned: true });
                } else {
                  await pool.query("UPDATE account SET isBanned = TRUE WHERE username = ?", [username]);
                }

                io.emit("announcement", `${username} has been banned by admin ${account.username}`);

                let target = io.sockets.sockets.find((socket) => socket.handshake.auth.token === username);
                if (target) {
                  target.emit("error", JSON.stringify({ message: `You have been banned by Admin ${account.username}`, logout: true }));
                }
              } else {
                socket.emit("announcement", "Invalid target, or arguments.");
              }
            } else if (content.startsWith("?unban")) {
              let username = content.split(" ")[1];
              if (username) {
                if (process.env.DATABASE === "mongodb") {
                  await Account.updateOne({ username: username }, { isBanned: false });
                }
                else {
                  await pool.query("UPDATE account SET isBanned = FALSE WHERE username = ?", [username]);
                }
                io.emit("announcement", `${username} has been forgiven by admin ${account.username}`);
              }
              else {
                socket.io.emit("announcement", "Invalid target, or arguments.");
              }
            }
          } else {
            io.emit("message", `${account.username}: ${content}`);
          }
        } else {
          io.emit("error", JSON.stringify({ logout: true }));
        }
      } catch (error) {
        console.error("Error executing query:", error);
      }
    });

    socket.on("disconnect", async (token) => {
      console.log(`User ${socket.handshake.address} disconnected`);
      if (process.env.DATABASE === "mongodb") {
        var account = await Account.findOne({ token });
      } else {
        var [rows] = await pool.query("SELECT * FROM account WHERE token = ?", [token]);
        var account = rows[0];
      }
      io.emit("announcement", `User ${account} has disconnected`);
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
