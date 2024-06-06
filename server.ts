const settings = require("./settings.json");

const express = require("express");
const next = require("next");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require('mysql2/promise');
const cors = require('cors');

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({dev});
const handle = nextApp.getRequestHandler();

const nodeCrypto = require('node:crypto');

const api = express()
api.use(cors());
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
    if (!new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
        res.status(400).send("Username must be 3-16 characters long and contain only letters and numbers");
        return;
    }
    let password = data.password;
    if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
        res.status(400).send("Password must contain only letters and numbers");
        return;
    }

    let passwordHash = nodeCrypto.hash('sha256', (nodeCrypto.hash('sha512', password)));

    const [rows] = await pool.query('SELECT * FROM account WHERE username = ?', [username]);

    if (rows.length > 0) {
        let account = rows[0];

        if (passwordHash === account.passwordHash) {
            if (account.token === null) {
                let token = nodeCrypto.randomBytes(16).toString('hex');
                await pool.query('UPDATE account SET token = ? WHERE username = ?', [token, username]);
                res.status(200).json({token: token});
            } else {
                res.status(200).json({token: account.token})
            }
        } else {
            res.status(401).send('Invalid password');
        }
    } else {
        res.status(404).send('Account not found');
    }
});

api.post('/api/register', async (req, res) => {
    const data = req.body;

    let username = data.username;
    let password = data.password;
    if (!new RegExp("^([A-Za-z0-9])+$").test(password)) {
        res.status(400).send("Password must contain only letters and numbers");
        return;
    }

    if (new RegExp("^(([A-Za-z0-9]){3,16})+$").test(username)) {
        const [rows] = await pool.query('SELECT * FROM account WHERE username = ?', [username]);
        if (rows.length > 0) {
            res.status(409).send('Username already exists');
        } else {
            let passwordHash = nodeCrypto.hash('sha256', (nodeCrypto.hash('sha512', password)));
            await pool.query('INSERT INTO account (username, passwordHash, token, isAdmin) VALUES (?, ?, NULL, FALSE)', [username, passwordHash]);
            res.status(200).send('Account created');
        }
    } else {
        res.status(400).send("Username must be 3-16 characters long and contain only letters and numbers");
    }
});

api.listen(2122, () => {
    console.log(`> API ready on http://localhost:2122`);
})

nextApp.prepare().then(() => {
    const app = express();

    const server = http.createServer(app);
    const io = new socketIo.Server(server);

    const onConnection = (socket) => {
        console.log(`User ${socket.handshake.address} connected`);
        io.emit("announcement", "An user has connected");

        socket.on("message", async (message) => {
            console.log('Received message:', message); // Log the received message

            if (!message || !message.token || !message.message) {
                console.log('Invalid message received:', message);
                socket.emit('announcement', 'Invalid message received');
                return;
            }

            let token = JSON.parse(message.token).token;
            let content = message.message;

            try {
                let [rows] = await pool.query('SELECT username FROM account WHERE BINARY token = ?', [token]);
                console.log('Query result:', rows);
                io.emit('message', `${rows[0].username}: ${content}`);
            } catch (error) {
                console.error('Error executing query:', error);
            }
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
