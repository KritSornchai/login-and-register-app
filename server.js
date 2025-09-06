const express = require('express'); 
const fs = require('fs'); 
const app = express(); 
const port = 3000; 

app.use(express.json()); 
app.use(express.static(__dirname)); 

app.post('/register', (req, res) => { 
 const { username, password } = req.body; 

 fs.readFile('users.json', 'utf8', (err, data) => { 
 if (err && err.code !== 'ENOENT') { 
 return res.status(500).send('Error reading users file.'); 
 } 

 const users = data ? JSON.parse(data) : []; 

 if (users.find(user => user.username === username)) { 
 return res.status(400).send('Username already exists.'); 
 } 

 users.push({ username, password }); 

 fs.writeFile('users.json', JSON.stringify(users, null, 2), (err) => { 
 if (err) { 
 return res.status(500).send('Error saving user.'); 
 } 
 res.status(200).send('User registered successfully.'); 
 }); 
 }); 
}); 

app.post('/login', (req, res) => { 
 const { username, password } = req.body; 

 fs.readFile('users.json', 'utf8', (err, data) => { 
 if (err) { 
 return res.status(500).send('Error reading users file.'); 
 } 

 const users = JSON.parse(data); 
 const user = users.find(u => u.username === username && u.password === password); 

 if (user) { 
 res.status(200).send('Login successful.'); 
 } else { 
 res.status(400).send('Invalid username or password.'); 
 } 
 }); 
}); 

app.listen(port, () => { 
 console.log(`Server is running on http://localhost:${port}`); 
}); 