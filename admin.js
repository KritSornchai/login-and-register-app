// DOM Elements
const loginContainer = document.getElementById('admin-login-container');
const dashboardContainer = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('admin-login-form');
const userTableBody = document.getElementById('user-table-body');
const logoutBtn = document.getElementById('logout-btn');

// Handle Admin Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const response = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        fetchAndDisplayUsers();
    } else {
        const message = await response.text();
        showFeedback(message, false);
    }
});

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    await fetch('/admin/logout', { method: 'POST' });
    dashboardContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    userTableBody.innerHTML = '';
});

// Function to fetch and display all users
async function fetchAndDisplayUsers() {
    const response = await fetch('/api/users', { cache: 'no-cache' }); // Keep cache fix
    if (!response.ok) {
        showFeedback('Failed to fetch users. You may not be logged in.', false);
        return;
    }
    const users = await response.json();
    userTableBody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        // RESTORED: Add the actual buttons back
        row.innerHTML = `
            <td>${user.username}</td>
            <td>
                <button class="action-button edit-btn">Edit Password</button>
                <button class="action-button delete-btn">Delete</button>
            </td>
        `;
        userTableBody.appendChild(row);

        // RESTORED: Add event listeners for the new buttons
        row.querySelector('.edit-btn').addEventListener('click', () => updateUserPassword(user.username));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteUser(user.username));
    });
}

// Function to handle updating a user's password
async function updateUserPassword(username) {
    const newPassword = prompt(`Enter new password for ${username}:`);
    if (newPassword === null || newPassword.trim() === '') {
        showFeedback('Password update cancelled.', false);
        return;
    }
    const response = await fetch(`/api/users/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
    });
    const message = await response.text();
    showFeedback(message, response.ok);
}

// Function to handle deleting a user
async function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete the user '${username}'?`)) {
        return;
    }
    const response = await fetch(`/api/users/${username}`, {
        method: 'DELETE'
    });
    const message = await response.text();
    showFeedback(message, response.ok);
    if (response.ok) {
        fetchAndDisplayUsers(); // Refresh the user list
    }
}