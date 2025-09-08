// server.js (The new, clean version)

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

// Import our new route files
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const port = 3000;

// ======================================================
// 1. MIDDLEWARE
// ======================================================
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
}));

// ======================================================
// 2. API ROUTES
// ======================================================
// Tell the app to use the imported route files.
// Any route starting with '/' will be handled by authRoutes.
// Any route will also be checked by adminRoutes.
app.use(authRoutes);
app.use(adminRoutes);

// ======================================================
// 3. PAGE SERVING & STATIC FILES
// ======================================================
// Serve the static frontend files (HTML, CSS, client-side JS)
app.use(express.static(__dirname));

// Serve the main pages
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// The root route should be last to act as a catch-all for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ======================================================
// 4. SERVER INITIALIZATION
// ======================================================
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Admin dashboard at http://localhost:${port}/admin`);
});