import "dotenv/config";
import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import type { Request, Response } from 'express';

import cors from 'cors';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const prisma = new PrismaClient();
const app = next({ dev, hostname, port });
const api = express();

const handler = app.getRequestHandler();
api.use(cors());

api.post('/api/login', async (req: Request, res: Response) => {
    const { username, hashedPassword } = req.body as { username: string, hashedPassword: string };

    if (!/^[a-z0-9]{4,16}$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    if (!/^[a-f0-9]{128}$/.test(hashedPassword)) {
        return res.status(400).json({ error: 'Invalid password format' });
    }

    const user = await prisma.user.findUnique({
        where: {
            username
        }
    });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.hashedPassword === hashedPassword) {
        return res.status(200).json({ success: 'Login successful' });
    } else {
        return res.status(401).json({ error: 'Invalid password' });
    }
});

app.prepare().then(() => {
    const httpServer = createServer(handler);
    const io = new Server(httpServer);
    io.on("connection", (socket) => {
        const time = new Date().toLocaleTimeString();
        console.log(`${time}: User ${socket.id} connected using ${socket.conn.transport.name}`);
        
        socket.on("disconnect", () => {
            console.log(`${time}: User ${socket.id} disconnected`);
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    }).on('error', (err) => {
        console.error(err);
        process.exit(1);
    });
});