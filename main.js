const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const cors = require('cors');

const app = express();
const videoFolder = 'public/videos';
const thumbnailFolder = 'public/thumbnail';
const dbFolder = 'public/db';
const dbFile = path.join(dbFolder, 'data.json');

app.use(express.static('web'));
app.use(express.static('public'));
app.use(cors());

const API_KEY = 'asd';


function verifyAPIKey(req, res, next) {
    const apiKey = req.query.apikey;
    if (apiKey && apiKey === API_KEY) {
        next();
    } else {
        res.status(401).json({
            error: 'Unauthorized'
        });
    }
}

function createThumbnail(videoPath) {
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const ext = path.extname(videoPath);
    
    let newVideoName = videoName;
    let counter = 1;

    if (ext !== '.mp4') {
        newVideoName += `_${generateRandomLetters()}`;
    }


    let data = [];
    try {
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
        }
    } catch (err) {
        console.error('Error reading or parsing data file:', err);
        return;
    }

    const existingDataIndex = data.findIndex(item => item.name === videoPath);

    while (existingDataIndex !== -1) {
        newVideoName = `${videoName}_${counter}`;
        existingDataIndex = data.findIndex(item => item.name === `${videoFolder}/${newVideoName}`);
        counter++;
    }


    const newVideoPath = path.join(videoFolder, `${newVideoName}${path.extname(videoPath)}`);
    fs.rename(videoPath, newVideoPath, (err) => {
        if (err) {
            console.error('Error renaming video file:', err);
            return;
        }

        console.log('Video file renamed successfully to:', newVideoPath);


        ffmpeg.ffprobe(newVideoPath, (err, metadata) => {
            if (err) {
                console.error('Error getting video duration:', err);
                return;
            }

            const durationSeconds = Math.floor(metadata.format.duration);
            const randomSecond = Math.floor(Math.random() * durationSeconds);

            ffmpeg(newVideoPath)
                .screenshots({
                    timestamps: [randomSecond],
                    filename: `${newVideoName}_thumbnail.jpg`,
                    folder: thumbnailFolder,
                })
                .on('end', () => {
                    console.log('Thumbnail generated successfully for:', newVideoPath);
                    updateDatabase(newVideoName, newVideoPath);
                })
                .on('error', (err) => {
                    console.error('Error generating thumbnail:', err);
                });
        });
    })
}

function generateRandomLetters() {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Huruf kecil dan besar
    const lettersLength = letters.length;
    let randomLetters = '';

    for (let i = 0; i < 3; i++) { // Mengulangi tiga kali untuk mendapatkan tiga huruf
        randomLetters += letters.charAt(Math.floor(Math.random() * lettersLength));
    }

    return randomLetters;
}

function updateDatabase(videoName, videoPath) {
    let data = [];
    try {
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
        }
    } catch (err) {
        console.error('Error reading or parsing data file:', err);
        return;
    }

    const existingDataIndex = data.findIndex(item => item.title === videoName);

    if (existingDataIndex !== -1) {
        console.log('Data already exists in the database:', videoName);
        return;
    }

    const thumbnailName = cleanFileName(`${videoName}_thumbnail.jpg`);
    const thumbnailPath = path.join('thumbnail', thumbnailName);

    const videoBaseName = path.basename(videoPath);
    const videoNewPath = path.join('videos', videoBaseName);

    const videoInfo = {
        title: videoName,
        name: videoNewPath,
        thumbnail: thumbnailPath
    };
    data.push(videoInfo);

    try {
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
        console.log('Data updated successfully in the database.');
    } catch (err) {
        console.error('Error writing data to file:', err);
        return;
    }
}


app.get('/db', verifyAPIKey, (req, res) => {

    let data = [];
    if (fs.existsSync(dbFile)) {
        data = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
    }

    res.json(data);
});

const watcher = chokidar.watch(videoFolder, {
    persistent: true,
    ignoreInitial: true,
});

watcher.on('add', (videoPath) => {
    console.log('New video added:', videoPath);
    createThumbnail(videoPath);
});


const thumbnailWatcher = chokidar.watch(thumbnailFolder, {
    persistent: true,
    ignoreInitial: true,
});

thumbnailWatcher.on('add', (thumbnailPath) => {
    console.log('New thumbnail added:', thumbnailPath);

    const thumbnailName = path.basename(thumbnailPath);
    const cleanThumbnailName = cleanFileName(thumbnailName);
    const newThumbnailPath = path.join(thumbnailFolder, cleanThumbnailName);


    fs.rename(thumbnailPath, newThumbnailPath, (err) => {
        if (err) {
            console.error('Error renaming thumbnail:', err);
            return;
        }
        console.log('Thumbnail renamed successfully:', newThumbnailPath);
    });
});


fs.readdir(videoFolder, (err, files) => {
    if (err) {
        console.error('Error reading video folder:', err);
        return;
    }
    files.forEach((file) => {
        const videoPath = path.join(videoFolder, file);
        createThumbnailIfNotExists(videoPath);
    });
});


setInterval(() => {
    fs.readdir(videoFolder, (err, files) => {
        if (err) {
            console.error('Error reading video folder:', err);
            return;
        }
        files.forEach((file) => {
            const videoPath = path.join(videoFolder, file);
            createThumbnailIfNotExists(videoPath);
        });
    });
}, 60000);

function createThumbnailIfNotExists(videoPath) {
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const thumbnailName = `${cleanFileName(videoName)}_thumbnail.jpg`;
    const thumbnailPath = path.join(thumbnailFolder, thumbnailName);

    if (!fs.existsSync(thumbnailPath)) {
        createThumbnail(videoPath);
    } else {
        console.log(`Thumbnail already exists for ${videoName}`);
    }
}

function cleanFileName(fileName) {

    let cleanedName = fileName.replace(/\s+/g, '_');

    cleanedName = cleanedName.replace(/[^a-zA-Z0-9_().]/g, '');
    return cleanedName;
}

console.log('Watching for new videos in:', videoFolder);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});