const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const cors = require('cors');


const app = express();
// const videoFolder = 'public/videos';
// const thumbnailFolder = 'public/thumbnail';

const videoFolder = 'videos';
const thumbnailFolder = 'thumbnail';

app.use(express.static('web'));
app.use(express.static('public'));
app.use(cors()); // Menambahkan middleware CORS

const API_KEY = 'asd'; // Ganti dengan API key Anda

// Membuat fungsi middleware untuk memverifikasi API key
function verifyAPIKey(req, res, next) {
    const apiKey = req.query.apikey;
    if (apiKey && apiKey === API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

function createThumbnail(videoPath) {
    const videoName = path.basename(videoPath, path.extname(videoPath)); 

    ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
            console.error('Error getting video duration:', err);
            return;
        }

        const durationSeconds = Math.floor(metadata.format.duration); 
        const randomSecond = Math.floor(Math.random() * durationSeconds) + 1; 

        ffmpeg(videoPath)
            .screenshots({
                timestamps: [randomSecond],
                filename: `${videoName}_thumbnail.jpg`, 
                folder: thumbnailFolder,
            })
            .on('end', () => {
                console.log('Thumbnail generated successfully for:', videoPath);
            })
            .on('error', (err) => {
                console.error('Error generating thumbnail:', err);
            });
    });
}

// Menambahkan middleware untuk memverifikasi API key pada endpoint
app.get('/db', verifyAPIKey, (req, res) => {
    
    fs.readdir(videoFolder, (err, files) => {
        if (err) {
            console.error('Error reading video folder:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const videos = [];
        files.forEach((file) => {
            const thumbnailName = `${path.basename(file, path.extname(file))}_thumbnail.jpg`;
            const thumbnailPath = `${req.protocol}://${req.get('host')}/thumbnail/${thumbnailName}`; // Path URL ke thumbnail
            const videoName = `${req.protocol}://${req.get('host')}/videos/${file}`; // Path URL ke video
            const title = path.basename(file, path.extname(file));


            videos.push({ title: title, name: videoName, thumbnail: thumbnailPath });
        });

        res.json(videos);
    });
});


const watcher = chokidar.watch(videoFolder, { 
    persistent: true,
    ignoreInitial: true, 
});

watcher.on('add', (videoPath) => {
    console.log('New video added:', videoPath);
    createThumbnail(videoPath);
});

console.log('Watching for new videos in:', videoFolder);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

