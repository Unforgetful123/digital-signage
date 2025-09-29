const express = require('express');
const router = express.Router();

let currentAlert = null;

router.post('/trigger', (req, res) => {
  const { message, type } = req.body;
  currentAlert = {
    message,
    type,
    timestamp: new Date(),
  };
  res.send({ success: true, alert: currentAlert });
});

router.get('/current', (req, res) => {
  res.send({ alert: currentAlert });
});

router.post('/clear', (req, res) => {
  currentAlert = null;
  res.send({ success: true });
});

module.exports = router;
