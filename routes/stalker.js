const express = require('express');
const router = express.Router();

const { whatsappChannel } = require('../controllers/stalker/whatsapp-channel');
const { freefire } = require('../controllers/stalker/freefire');

router.get('/whatsapp-channel', whatsappChannel);
router.get('/freefire', freefire);

module.exports = router;