// DotENV
import "dotenv/config";

// Express, Next, Socket.IO, etc...
import express from "express";
import next from "next";
import http from "http";
import {
    Server as socketIo, Socket
} from "socket.io";

interface CustomSocket extends Socket {
    username?: string;
}
import cors from "cors";

// Database
import sqlite3 from "sqlite3";
import {
    open
} from "sqlite";

// Initialization
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({
    dev
});
import * as nodeCrypto from "crypto";
const handle = nextApp.getRequestHandler();
const app = express();

let connected: string[] = [];

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
    token TEXT,
    isAdmin BOOLEAN DEFAULT FALSE
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

app.post("/api/login", async (req, res) => {
    const data = req.body;
    let username = data.username.toLowerCase();

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
                res.status(200).json({
                    token: token
                });
            } else {
                res.status(200).json({
                    token: account.token
                });
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

    let username = data.username.toLowerCase();
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
                `INSERT INTO account (username, passwordHash, token, isAdmin) VALUES (?, ?, NULL, FALSE)`,
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
    
        socket.on("connectionPing", async (token: string) => {
            try {
                console.log(token);
                const account = await db.get(`SELECT * FROM account WHERE token = ?`, [token]);
                console.log(account);
                if (account != undefined) {
                    console.log("Sending announcement event");
                    connected.push(account.username);
                    socket.username = account.username; // Store username in socket object
                    io.emit("announcement", `${account.username} has connected!`);
                } else {
                    console.log("Sending logout event");
                    socket.emit("error", JSON.stringify({ logout: true }));
                }
            } catch (error) {
                console.error("Error executing query:", error);
            }
        });
    
        socket.on("message", async (message, callback) => {
            debug("Received message event", message);
            if (!message || !message.token || !message.message) {
                console.log("Invalid message received:", message);
                socket.emit("announcement", "Invalid message/token received");
                callback({ status: 400, error: "Invalid message/token received" });
                return;
            }
            let token;
            try {
                token = message.token;
            } catch (error) {
                console.error("Error parsing token:", error);
                socket.emit("error", JSON.stringify({ logout: true }));
                callback({ status: 400, error: "Invalid token format" });
                return;
            }
            let content = message.message
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
            debug("Sanitized message content", content);
    
            try {
                const account = await db.get(`SELECT * FROM account WHERE token = ?`, [token]);
                debug("Database query result", account);
                if (account) {
                    if (account.isAdmin) {
                        io.emit("adminMessage", `${account.username}: ${content}`);
    
                        if (content.startsWith("/")) {
                            const command = content.split(" ")[0].slice(1);
                            const args = content.split(" ").slice(1);
                            switch (command) {
                                case "announce":
                                    io.emit("announcement", args.join(" "));
                                    break
                                case "list":
                                    io.emit("announcement", `Connected users: ${connected.join(", ")}`);
                                    break;
                                case "dice":
                                    io.emit("announcement", `Rolled a dice: ${Math.floor(Math.random() * 6) + 1}`);
                                    break;
                                case "coinflip":
                                    io.emit("announcement", `Flipped a coin: ${Math.random() < 0.5 ? "Heads" : "Tails"}`);
                                    break;
                                case "help":
                                    io.emit("announcement", `Available commands: /announce, /list, /dice, /coinflip, /help`);
                                    break;
                                default:
                                    io.emit("announcement", `Unknown command: ${command}`);
                                    break;
                            }
                        }
                    } else {
                        io.emit("message", `${account.username}: ${content}`);
                    }
                    callback({ status: 200 });
                } else {
                    console.log("Invalid token, logging out");
                    socket.emit("error", JSON.stringify({ logout: true }));
                    callback({ status: 401, error: "Invalid token" });
                }
            } catch (error) {
                console.error("Error executing query:", error);
                callback({ status: 500, error: "Internal server error" });
            }
        });
    
        function debug(message: string, data?: any) {
            console.log(`[DEBUG] ${message}`, data || "");
        }
    
        socket.on("disconnect", () => {
            const index = connected.indexOf(socket.username);
            if (index !== -1) {
                connected.splice(index, 1);
                io.emit("announcement", `${socket.username} has disconnected!`);
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
