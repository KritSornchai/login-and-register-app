//****  3rd stage of how data is flown ****// (actually receives the request then gets to work by 
// firstly encrypting the user's passwords then sends another request to db.js to insert a new user)

//**** 5th stage of how data is flown ****// (receives response from db whether the insert operation was a success
// then sends the success status (200) )



const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db'); // We will create this db connection file next

const router = express.Router();

// Handle user registration
router.post('/register', async (req, res) => {
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

// Handle user login
router.post('/login', async (req, res) => {
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

module.exports = router;