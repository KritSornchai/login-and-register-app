//****  1st stage of how data is flown ****// (when registering your account then sends request to server)

//**** 6th or final stage of how data is flown****// (receives the response (status) from authRoutes.js then,
//  delivers the user feedback bubble)


// --- New Feedback Function ---
const feedbackContainer = document.getElementById('feedback-container');

function showFeedback(message, isSuccess) {
  // Create the notification element
  const feedbackDiv = document.createElement('div');
  feedbackDiv.className = 'feedback-message';
  feedbackDiv.textContent = message;

  // Add the appropriate class for success or error
  if (isSuccess) {
    feedbackDiv.classList.add('feedback-success');
  } else {
    feedbackDiv.classList.add('feedback-error');
  }

  // Add the message to the container
  feedbackContainer.appendChild(feedbackDiv);

  // Animate the message in
  setTimeout(() => {
    feedbackDiv.classList.add('show');
  }, 10); // A small delay is needed for the animation to trigger

  // Automatically remove the message after 3 seconds
  setTimeout(() => {
    feedbackDiv.classList.remove('show');
    // Remove the element from the DOM after the fade-out animation completes
    feedbackDiv.addEventListener('transitionend', () => feedbackDiv.remove());
  }, 3000);
}


// --- Updated Form Logic ---
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;

  const response = await fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const message = await response.text();
  // The 'response.ok' property is true for successful HTTP statuses (like 200)
  showFeedback(message, response.ok);
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  const response = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const message = await response.text();
  showFeedback(message, response.ok);
});