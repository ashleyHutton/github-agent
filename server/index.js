const express = require('express');
const path = require('path');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.use('/api', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`GitHub Agent server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
