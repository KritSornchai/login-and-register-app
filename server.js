const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// ======================================================
// 1. DATABASE CONNECTION
// ======================================================
const pool = new Pool({
    user: 'user01',
    host: 'localhost',
    database: 'user_login_app',
    password: '',
    port: 5000,
});

// ======================================================
// 2. MIDDLEWARE
// ======================================================
app.use(express.json());
app.use(session({
    secret: 'a-super-secret-key-that-should-be-changed',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
}));

// ======================================================
// 3. API ROUTES
// ======================================================

// --- REGULAR USER API ROUTES ---
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, password) VALUES ($1, $2)",
            [username, hashedPassword]
        );
        res.status(200).send('User registered successfully.');
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).send('Username already exists.');
        }
        console.error("Error in /register:", err);
        res.status(500).send('Error registering user.');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];
        if (user && await bcrypt.compare(password, user.password)) {
            res.status(200).send('Login successful.');
        } else {
            res.status(400).send('Invalid username or password.');
        }
    } catch (err) {
        console.error("Error in /login:", err);
        res.status(500).send('Server error during login.');
    }
});

// --- ADMIN API ROUTES ---
const ADMIN_USER = { username: 'admin', password: 'mypassword' };

// UPDATED: Admin Login with a debugging console.log
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // =========================================================================
    // DEBUGGING LINE: This will print the received credentials to your terminal.
    console.log("Admin login attempt received with:", { username: username, password: password });
    // =========================================================================

    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        req.session.isAdmin = true;
        console.log("Admin login successful.");
        res.status(200).send('Admin login successful.');
    } else {
        console.log("Admin login failed. Credentials do not match.");
        res.status(401).send('Invalid admin credentials.');
    }
});

app.post('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        console.log("Admin session destroyed.");
        res.send('Logged out');
    });
});
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Forbidden');
    }
}
app.get('/api/admin/status', (req, res) => {
    res.json({ loggedIn: !!req.session.isAdmin });
});

app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT username FROM users ORDER BY created_at ASC");
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error in GET /api/users:", err);
        res.status(500).send('Server error.');
    }
});

app.delete('/api/users/:username', requireAdmin, async (req, res) => {
    const { username } = req.params;
    try {
        const deleteOp = await pool.query("DELETE FROM users WHERE username = $1", [username]);
        if (deleteOp.rowCount === 0) {
            return res.status(404).send('User not found.');
        }
        res.status(200).send(`User '${username}' deleted successfully.`);
    } catch (err) {
        console.error("Error in DELETE /api/users:", err);
        res.status(500).send('Server error.');
    }
});

app.put('/api/users/:username', requireAdmin, async (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateOp = await pool.query(
            "UPDATE users SET password = $1 WHERE username = $2",
            [hashedPassword, username]
        );
        if (updateOp.rowCount === 0) {
            return res.status(404).send('User not found.');
        }
        res.status(200).send(`Password for '${username}' updated successfully.`);
    } catch (err) {
        console.error("Error in PUT /api/users:", err);
        res.status(500).send('Server error.');
    }
});

// ======================================================
// 4. PAGE SERVING & STATIC FILES
// ======================================================
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.use(express.static(__dirname));

// ======================================================
// 5. SERVER INITIALIZATION
// ======================================================
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Admin dashboard at http://localhost:${port}/admin`);
});