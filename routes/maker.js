const express = require("express");
const router = express.Router();

const { brat } = require("../controllers/maker/brat");
// const { fakeDana } = require('../controllers/maker/fake-dana'); // PENDING
// const { fakeLobbyFfSquad } = require('../controllers/maker/fake-lobby-ff-squad'); // PENDING
const { fakeLobbyMl } = require("../controllers/maker/fake-lobby-ml");
const { fakeNgl } = require("../controllers/maker/fake-ngl");
const { fakeOvo } = require("../controllers/maker/fake-ovo");
const { nasaLandsat } = require("../controllers/maker/nasa-landsat");
const { windowsQuotes } = require("../controllers/maker/windows-quotes");
const { carbonCode } = require("../controllers/maker/carbon-code");

router.get("/brat", brat);
// router.get('/fake-dana', fakeDana); // PENDING
// router.get('/fake-lobby-ff-squad', fakeLobbyFfSquad); // PENDING
router.get("/fake-lobby-ml", fakeLobbyMl);
router.get("/fake-ngl", fakeNgl);
router.get("/fake-ovo", fakeOvo);
router.get("/nasa-landsat", nasaLandsat);
router.get("/windows-quotes", windowsQuotes);
router.get("/carbon-code", carbonCode);

module.exports = router;
