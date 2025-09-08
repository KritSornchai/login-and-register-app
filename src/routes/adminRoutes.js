// src/routes/adminRoutes.js

const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db'); // Also uses the shared db connection

const router = express.Router();

const ADMIN_USER = { username: 'admin', password: 'adm' };

// --- Middleware (Specific to these admin routes) ---
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Forbidden');
    }
}

// --- Admin Auth Routes ---
router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        req.session.isAdmin = true;
        res.status(200).send('Admin login successful.');
    } else {
        res.status(401).send('Invalid admin credentials.');
    }
});

router.post('/admin/logout', (req, res) => {
    req.session.destroy(() => res.send('Logged out'));
});

router.get('/api/admin/status', (req, res) => {
    res.json({ loggedIn: !!req.session.isAdmin });
});

// --- Admin CRUD API Routes (All protected by requireAdmin) ---
router.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT username FROM users ORDER BY created_at ASC");
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).send('Server error.');
    }
});

router.delete('/api/users/:username', requireAdmin, async (req, res) => {
    const { username } = req.params;
    try {
        const deleteOp = await pool.query("DELETE FROM users WHERE username = $1", [username]);
        if (deleteOp.rowCount === 0) return res.status(404).send('User not found.');
        res.status(200).send(`User '${username}' deleted successfully.`);
    } catch (err) {
        res.status(500).send('Server error.');
    }
});

router.put('/api/users/:username', requireAdmin, async (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateOp = await pool.query(
            "UPDATE users SET password = $1 WHERE username = $2",
            [hashedPassword, username]
        );
        if (updateOp.rowCount === 0) return res.status(404).send('User not found.');
        res.status(200).send(`Password for '${username}' updated successfully.`);
    } catch (err) {
        res.status(500).send('Server error.');
    }
});

module.exports = router;