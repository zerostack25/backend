const express = require('express');
const router = express.Router();

const { fontSearch } = require('../controllers/search/font-search');
const { lyrics } = require('../controllers/search/lyrics');
const { resepMakanan } = require('../controllers/search/resep-makanan');
const { soundcloud } = require('../controllers/search/soundcloud');
const { tiktokImage } = require('../controllers/search/tiktok-image');
const { tiktok } = require('../controllers/search/tiktok');
const { ytSearch } = require('../controllers/search/yt-search');

router.get('/font-search', fontSearch);
router.get('/lyrics', lyrics);
router.get('/resep-makanan', resepMakanan);
router.get('/soundcloud', soundcloud);
router.get('/tiktok-image', tiktokImage);
router.get('/tiktok', tiktok);
router.get('/yt-search', ytSearch);

module.exports = router;