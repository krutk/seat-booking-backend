require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const config = require('./config/config');
require('./models/db')
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint for Elastic Beanstalk
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});