const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// ======================================================
// 1. TOP-LEVEL MIDDLEWARE
// ======================================================
app.use(express.json());

// ======================================================
// 2. API ROUTES
// ======================================================

// --- REGULAR USER API ROUTES (FULLY IMPLEMENTED) ---

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

// --- ADMIN API ROUTES (FULLY IMPLEMENTED) ---

const ADMIN_USER = { username: 'admin', password: 'adminpassword' };
let isAdminAuthenticated = false;

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        isAdminAuthenticated = true;
        res.status(200).send('Admin login successful.');
    } else {
        isAdminAuthenticated = false;
        res.status(401).send('Invalid admin credentials.');
    }
});

app.post('/admin/logout', (req, res) => {
    isAdminAuthenticated = false;
    res.status(200).send('Admin logged out successfully.');
});

function requireAdmin(req, res, next) {
    if (isAdminAuthenticated) {
        next();
    } else {
        res.status(403).send('Forbidden: Admin access required.');
    }
}

// GET all users (Read)
app.get('/api/users', requireAdmin, (req, res) => {
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading users file.');
        const users = data ? JSON.parse(data) : [];
        const usersWithoutPasswords = users.map(user => ({ username: user.username }));
        res.status(200).json(usersWithoutPasswords);
    });
});

// DELETE a user
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

// UPDATE a user's password
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
// 3. STATIC FILE SERVING
// ======================================================
app.use(express.static(__dirname));

// ======================================================
// 4. SERVER INITIALIZATION
// ======================================================
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Admin dashboard at http://localhost:${port}/admin.html`);
});