const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
app.use(bodyParser.json());
app.use(session({
  secret: 'replace-this-with-a-real-secret-string',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 } // 2 hour session
}));
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});