

require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: (origin, callback) => {
        if (process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    methods: ["GET", "POST"]
};

app.use(cors(corsOptions));
const io = socketIo(server, { cors: corsOptions });

io.on('connection', (socket) => {
    console.log('A user connected');

    let fileStream;
    let filename;

    socket.on('start', () => {
        filename = `recording_${Date.now()}.webm`;
        fileStream = fs.createWriteStream(filename, { flags: 'a' });
        console.log(`Recording to file: ${filename}`);
    });

    socket.on('data', (data) => {
        if (fileStream) {
            fileStream.write(Buffer.from(new Uint8Array(data)));
        }
    });

    socket.on('stop', () => {
        if (fileStream) {
            fileStream.end();
            console.log(`Finished recording to file: ${filename}`);
            socket.emit('saved', filename); // send filename back to client
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
