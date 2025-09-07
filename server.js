const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session'); // IMPORT the session package
const app = express();
const port = 3000;

// ======================================================
// 1. TOP-LEVEL MIDDLEWARE
// ======================================================
app.use(express.json());

// ADD AND CONFIGURE THE SESSION MIDDLEWARE
app.use(session({
    secret: 'a-super-secret-key-for-your-app', // Used to secure the session cookie
    resave: false,
    saveUninitialized: false, // Only create a session when a user logs in
    cookie: { maxAge: 1000 * 60 * 60 } // Cookie lasts for 1 hour
}));

// ======================================================
// 2. API ROUTES
// ======================================================

// --- REGULAR USER API ROUTES (Unchanged) ---

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') return res.status(500).send('Error reading users file.');
        const users = data ? JSON.parse(data) : [];
        if (users.find(user => user.username === username)) return res.status(400).send('Username already exists.');
        users.push({ username, password });
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) return res.status(500).send('Error saving user.');
            res.status(200).send('User registered successfully.');
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading users file.');
        const users = JSON.parse(data);
        const user = users.find(u => u.username === username && u.password === password);
        if (user) res.status(200).send('Login successful.');
        else res.status(400).send('Invalid username or password.');
    });
});

// --- ADMIN API ROUTES (Updated to use sessions) ---

const ADMIN_USER = { username: 'admin', password: 'adminpassword' };
// let isAdminAuthenticated = false; // REMOVED: The session handles this now.

// UPDATED: Admin Login
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        // SET SESSION DATA: This is how the server "remembers" the user.
        req.session.isAdmin = true;
        res.status(200).send('Admin login successful.');
    } else {
        res.status(401).send('Invalid admin credentials.');
    }
});

// UPDATED: Admin Logout
app.post('/admin/logout', (req, res) => {
    // DESTROY SESSION: Securely logs the user out.
    req.session.destroy(err => {
        if (err) return res.status(500).send('Could not log out.');
        res.status(200).send('Admin logged out successfully.');
    });
});

// UPDATED: Security Middleware checks the session
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next(); // User is an admin, proceed.
    } else {
        res.status(403).send('Forbidden: Admin access required.');
    }
}

// NEW: A route for the frontend to check if a session is active
app.get('/api/admin/status', (req, res) => {
    if (req.session.isAdmin) {
        res.status(200).json({ loggedIn: true });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

// These routes are now protected by the session-aware middleware
app.get('/api/users', requireAdmin, (req, res) => {
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading users file.');
        const users = data ? JSON.parse(data) : [];
        const usersWithoutPasswords = users.map(user => ({ username: user.username }));
        res.status(200).json(usersWithoutPasswords);
    });
});

app.delete('/api/users/:username', requireAdmin, (req, res) => {
    const { username } = req.params;
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading users file.');
        let users = data ? JSON.parse(data) : [];
        const filteredUsers = users.filter(user => user.username !== username);
        if (users.length === filteredUsers.length) return res.status(404).send('User not found.');
        fs.writeFile(usersFilePath, JSON.stringify(filteredUsers, null, 2), (err) => {
            if (err) return res.status(500).send('Error saving user data.');
            res.status(200).send(`User '${username}' deleted successfully.`);
        });
    });
});

app.put('/api/users/:username', requireAdmin, (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading users file.');
        let users = data ? JSON.parse(data) : [];
        const userToUpdate = users.find(user => user.username === username);
        if (!userToUpdate) return res.status(404).send('User not found.');
        userToUpdate.password = newPassword;
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) return res.status(500).send('Error saving user data.');
            res.status(200).send(`Password for '${username}' updated successfully.`);
        });
    });
});

// ======================================================
// 3. PAGE SERVING & STATIC FILES
// ======================================================
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.static(__dirname));

// ======================================================
// 4. SERVER INITIALIZATION
// ======================================================
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Admin dashboard at http://localhost:${port}/admin`);
});