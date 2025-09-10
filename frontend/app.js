const socket = io();

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const regBtn = document.getElementById('regBtn');
const uploadBtn = document.getElementById('uploadBtn');
const videoFile = document.getElementById('videoFile');
const feed = document.getElementById('feed');
const messages = document.getElementById('messages');
const m = document.getElementById('m');
const sendBtn = document.getElementById('sendBtn');
const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const uploadArea = document.getElementById('uploadArea');

// Theme Management
let currentTheme = localStorage.getItem('theme') || 'dark';
applyTheme(currentTheme);

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
  localStorage.setItem('theme', currentTheme);
});

function applyTheme(theme) {
  document.body.className = theme + '-theme';
  themeToggle.innerHTML = theme === 'dark' ?
    '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Tab Switching
function showTab(tabName) {
  // Hide all forms
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.remove('active');
  });

  // Remove active class from all tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected form
  document.getElementById(tabName).classList.add('active');

  // Activate the corresponding tab button
  const tabButton = document.querySelector(`button[onclick="showTab('${tabName}')"]`);
  if (tabButton) {
    tabButton.classList.add('active');
  }
}

// Authentication
loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById('auth').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('currentUser').textContent = data.username || username;
      document.getElementById('userMenu').style.display = 'flex';
      loadVideos();
      showNotification(data.message || 'Welcome back, ' + username + '!', 'success');
    } else {
      showNotification(data.error || 'Invalid credentials', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Login failed - please try again', 'error');
  }
});

regBtn.addEventListener('click', async () => {
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;

  if (!username || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  if (password.length < 6) {
    showNotification('Password must be at least 6 characters', 'error');
    return;
  }

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(data.message || 'Account created successfully! Please login.', 'success');
      // Clear form first
      document.getElementById('regUsername').value = '';
      document.getElementById('regPassword').value = '';
      // Small delay to show the success message before switching tabs
      setTimeout(() => {
        showTab('login');
      }, 500);
    } else {
      showNotification(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification('Registration failed - please try again', 'error');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/logout');
    document.getElementById('auth').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    document.getElementById('userMenu').style.display = 'none';
    showNotification('Logged out successfully', 'success');
  } catch (error) {
    showNotification('Logout failed', 'error');
  }
});

// Upload Functionality
uploadArea.addEventListener('click', () => {
  videoFile.click();
});

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--primary-color)';
  uploadArea.style.background = 'rgba(255, 0, 80, 0.05)';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = 'var(--border-color)';
  uploadArea.style.background = 'rgba(255, 255, 255, 0.05)';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--border-color)';
  uploadArea.style.background = 'rgba(255, 255, 255, 0.05)';

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith('video/')) {
    videoFile.files = files;
    handleUpload();
  } else {
    showNotification('Please select a valid video file', 'error');
  }
});

videoFile.addEventListener('change', handleUpload);

async function handleUpload() {
  if (!videoFile.files[0]) return;

  const file = videoFile.files[0];
  if (file.size > 1024 * 1024 * 1024) { // 1GB limit
    showNotification('File size must be less than 1GB', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('video', file);

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

  // Show upload progress
  const progressBar = document.createElement('div');
  progressBar.className = 'upload-progress';
  progressBar.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill"></div>
    </div>
    <div class="progress-text" id="progressText">Uploading... 0%</div>
  `;
  uploadArea.appendChild(progressBar);

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        document.getElementById('progressFill').style.width = percentComplete + '%';
        document.getElementById('progressText').textContent = `Uploading... ${Math.round(percentComplete)}%`;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        loadVideos();
        showNotification('Video uploaded successfully!', 'success');
        videoFile.value = '';
      } else {
        showNotification('Upload failed - please login first', 'error');
      }
      progressBar.remove();
    });

    xhr.addEventListener('error', () => {
      showNotification('Upload failed', 'error');
      progressBar.remove();
    });

    xhr.open('POST', '/upload');
    xhr.send(formData);

  } catch (error) {
    showNotification('Upload failed', 'error');
    progressBar.remove();
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Video';
  }
}

// Load Videos
async function loadVideos() {
  try {
    const response = await fetch('/videos');
    const videos = await response.json();

    feed.innerHTML = '';

    if (videos.length === 0) {
      feed.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-video-slash"></i>
          <h3>No videos yet</h3>
          <p>Be the first to share a video!</p>
        </div>
      `;
      return;
    }

    videos.forEach(video => {
      const videoCard = document.createElement('div');
      videoCard.className = 'video-card';

      videoCard.innerHTML = `
        <video controls>
          <source src="/uploads/${video.filename}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        <div class="video-info">
          <h4>${video.filename.replace(/\.[^/.]+$/, "")}</h4>
          <p>By: ${video.user}</p>
          <div class="video-actions">
            <button class="download-btn" onclick="downloadVideo('${video.filename}')">
              <i class="fas fa-download"></i> Download
            </button>
          </div>
        </div>
      `;

      feed.appendChild(videoCard);
    });
  } catch (error) {
    showNotification('Failed to load videos', 'error');
  }
}

// Download Video
function downloadVideo(filename) {
  const link = document.createElement('a');
  link.href = `/uploads/${filename}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('Download started!', 'success');
}

// Chat Functionality
sendBtn.addEventListener('click', () => {
  const message = m.value.trim();
  if (message) {
    socket.emit('chat message', message);
    m.value = '';
  }
});

m.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});

socket.on('chat message', (msg) => {
  const li = document.createElement('li');
  li.textContent = msg;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// Notification System
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    ${message}
  `;

  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => notification.classList.add('show'), 100);

  // Hide notification
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add notification styles
const notificationStyles = `
  .notification {
    position: fixed;
    top: 100px;
    right: 20px;
    background: var(--card-bg);
    color: var(--text-primary);
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--primary-color);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .notification.success {
    border-left-color: #00f2ea;
  }

  .notification.error {
    border-left-color: #ff0050;
  }

  .notification.show {
    transform: translateX(0);
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .empty-state i {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
`;

const style = document.createElement('style');
style.textContent = notificationStyles;
document.head.appendChild(style);

// Initialize
loadVideos();