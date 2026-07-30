const express = require('express');
const router = express.Router();

const { ssweb } = require('../controllers/tools/ssweb');
const { link4m } = require('../controllers/tools/link4m');
const { nik } = require('../controllers/tools/nik');
const { recordWeb } = require('../controllers/tools/record-web');
const { tiktokBoost } = require('../controllers/tools/tiktok-boost');
const { web2zip } = require('../controllers/tools/web2zip');

// Image tools
const { enhancer } = require('../controllers/tools/enhancer');
const { removebg } = require('../controllers/tools/removebg');
const { topixel } = require('../controllers/tools/topixel');

// Tempmail
const { tempmail } = require('../controllers/tools/tempmail');

// Network info
const { iplocations } = require('../controllers/tools/iplocations');
const { domaininfo } = require('../controllers/tools/domaininfo');

router.get('/ssweb', ssweb);
router.get('/link4m', link4m);
router.get('/nik', nik);
router.get('/record-web', recordWeb);
router.get('/tiktok-boost', tiktokBoost);
router.get('/web2zip', web2zip);

// Image routes (POST for file upload, GET for URL)
router.post('/enhancer', enhancer);
router.get('/enhancer', enhancer);
router.post('/removebg', removebg);
router.get('/removebg', removebg);
router.post('/topixel', topixel);
router.get('/topixel', topixel);

// Tempmail
router.get('/tempmail', tempmail);

// Network info
router.get('/iplocations', iplocations);
router.get('/domaininfo', domaininfo);

module.exports = router;