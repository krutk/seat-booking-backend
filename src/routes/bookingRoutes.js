const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAvailableSeats, bookSeats, cancelBooking } = require('../controllers/bookingController');

router.get('/seats', auth, getAvailableSeats);
router.post('/book', auth, bookSeats);
router.post('/cancel', auth, cancelBooking);

module.exports = router;