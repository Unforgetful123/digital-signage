const express = require('express');         // Import Express
const cors = require('cors');               // Enable CORS
const alertRoutes = require('./routes/alerts'); // Import routes
require('dotenv').config();                 // Load .env variables

const app = express();
app.use(cors());                            // Allow cross-origin requests
app.use(express.json());                    // Parse JSON request bodies

app.use('/api/alerts', alertRoutes);        // Mount alert routes at /api/alerts

app.get('/', (req, res) => {
  res.send('Server is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
