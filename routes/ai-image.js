const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.json({ message: "AI Image endpoint ready" });
});

const { image2prompt } = require("../controllers/ai-image/image-2-prompt");
const { toSketch } = require("../controllers/ai-image/to-skecth");

router.post("/image-2-prompt", image2prompt);
router.post("/to-sketch", toSketch);

module.exports = router;
