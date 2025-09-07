const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt'); // 1. IMPORT bcrypt
const app = express();
const port = 3000;

// ======================================================
// 1. TOP-LEVEL MIDDLEWARE
// ======================================================
app.use(express.json());

app.use(session({
    secret: 'a-super-secret-key-for-your-app',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
}));

// ======================================================
// 2. API ROUTES
// ======================================================

// --- REGULAR USER API ROUTES (UPDATED) ---

// UPDATED: Register route now hashes the password
app.post('/register', async (req, res) => { // Use async to allow 'await'
    const { username, password } = req.body;
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', async (err, data) => { // Use async here too
        if (err && err.code !== 'ENOENT') return res.status(500).send('Error reading users file.');
        const users = data ? JSON.parse(data) : [];
        if (users.find(user => user.username === username)) return res.status(400).send('Username already exists.');
        
        // 2. HASH THE PASSWORD before saving it
        const hashedPassword = await bcrypt.hash(password, 10); // "10" is the salt rounds, a standard value

        users.push({ username, password: hashedPassword }); // Save the HASHED password, not the original

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) return res.status(500).send('Error saving user.');
            res.status(200).send('User registered successfully.');
        });
    });
});

// UPDATED: Login route now compares the password with the stored hash
app.post('/login', async (req, res) => { // Use async
    const { username, password } = req.body;
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', async (err, data) => { // Use async
        if (err) return res.status(500).send('Error reading users file.');
        const users = JSON.parse(data);
        const user = users.find(u => u.username === username);

        // 3. COMPARE the submitted password with the stored hash
        if (user && await bcrypt.compare(password, user.password)) {
            // If the user exists AND the password hash matches, login is successful
            res.status(200).send('Login successful.');
        } else {
            // Either the user was not found or the password was incorrect
            res.status(400).send('Invalid username or password.');
        }
    });
});


// --- ADMIN API ROUTES (Partially Updated) ---

const ADMIN_USER = { username: 'admin', password: 'adminpassword' };

// (Admin login logic is unchanged because it's a hardcoded check)
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        req.session.isAdmin = true;
        res.status(200).send('Admin login successful.');
    } else {
        res.status(401).send('Invalid admin credentials.');
    }
});

app.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Could not log out.');
        res.status(200).send('Admin logged out successfully.');
    });
});

function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Forbidden: Admin access required.');
    }
}

app.get('/api/admin/status', (req, res) => {
    if (req.session.isAdmin) {
        res.status(200).json({ loggedIn: true });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

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

// UPDATED: Admin password update now hashes the new password
app.put('/api/users/:username', requireAdmin, async (req, res) => { // Use async
    const { username } = req.params;
    const { newPassword } = req.body;
    const usersFilePath = path.join(__dirname, 'users.json');
    fs.readFile(usersFilePath, 'utf8', async (err, data) => { // Use async
        if (err) return res.status(500).send('Error reading users file.');
        let users = data ? JSON.parse(data) : [];
        const userToUpdate = users.find(user => user.username === username);
        if (!userToUpdate) return res.status(404).send('User not found.');

        // 4. HASH THE NEW PASSWORD before the admin saves it
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        userToUpdate.password = hashedPassword;

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