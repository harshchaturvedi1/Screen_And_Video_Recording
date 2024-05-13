require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

    let screenFileStream, videoFileStream;
    let userId = socket.handshake.query.userId || 'defaultUser'; // Assume user ID is passed during socket connection
    let baseDir = path.join(__dirname, 'recordings', userId);
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    socket.on('screen_data', (data) => {
        if (!screenFileStream) {
            let screenFilename = path.join(baseDir, 'screenFile', `screen_recording_${Date.now()}.webm`);
            fs.mkdirSync(path.dirname(screenFilename), { recursive: true });
            screenFileStream = fs.createWriteStream(screenFilename, { flags: 'a' });
        }
        screenFileStream.write(Buffer.from(new Uint8Array(data)));
    });

    socket.on('video_data', (data) => {
        if (!videoFileStream) {
            let videoFilename = path.join(baseDir, 'videoFile', `video_recording_${Date.now()}.webm`);
            fs.mkdirSync(path.dirname(videoFilename), { recursive: true });
            videoFileStream = fs.createWriteStream(videoFilename, { flags: 'a' });
        }
        videoFileStream.write(Buffer.from(new Uint8Array(data)));
    });

    socket.on('stop_recording', () => {
        if (screenFileStream) {
            screenFileStream.end();
            screenFileStream = null;
        }
        if (videoFileStream) {
            videoFileStream.end();
            videoFileStream = null;
        }
    });

    socket.on('disconnect', () => {
        if (screenFileStream) {
            screenFileStream.end();
            screenFileStream = null;
        }
        if (videoFileStream) {
            videoFileStream.end();
            videoFileStream = null;
        }
    });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
