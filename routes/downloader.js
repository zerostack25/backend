const express = require('express');
const router = express.Router();

const { tiktok } = require('../controllers/downloader/tiktok');
const { ytdl } = require('../controllers/downloader/ytdl');
const { instagram } = require('../controllers/downloader/instagram');
const { spotifyDl } = require('../controllers/downloader/spotify-dl');
const { stickerly } = require('../controllers/downloader/stickerly');
const { terabox } = require('../controllers/downloader/terabox');
const { twitter } = require('../controllers/downloader/twitter');

router.get('/tiktok', tiktok);
router.get('/ytdl', ytdl);
router.get('/instagram', instagram);
router.get('/spotify-dl', spotifyDl);
router.get('/stickerly', stickerly);
router.get('/terabox', terabox);
router.get('/twitter', twitter);

module.exports = router;