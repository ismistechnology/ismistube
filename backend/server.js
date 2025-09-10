const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Environment configuration
const PORT = process.env.PORT || 3004;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for production (important for session and IP detection)
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for development (localhost)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());

// Increase payload size limits for large video uploads
app.use(express.urlencoded({ extended: true, limit: '1gb' }));
app.use(express.json({ limit: '1gb' }));

let videos = [];
if (fs.existsSync('./videos.json')) {
  videos = JSON.parse(fs.readFileSync('./videos.json', 'utf8'));
}

let users = [];
if (fs.existsSync('./users.json')) {
  users = JSON.parse(fs.readFileSync('./users.json', 'utf8'));
}

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '../uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Registration attempt:', { username, password: password ? 'provided' : 'missing' });

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });

    // Save to file
    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2));
    console.log('User registered successfully:', username);

    res.json({ message: 'User registered successfully', username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password: password ? 'provided' : 'missing' });

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = username;
      console.log('User logged in successfully:', username);
      res.json({ message: 'Logged in successfully', username });
    } else {
      console.log('Invalid credentials for:', username);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.send('Logged out');
});

app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.session.user) return res.status(401).send('Not logged in');
  videos.push({ id: videos.length + 1, filename: req.file.filename, user: req.session.user });
  fs.writeFileSync('./videos.json', JSON.stringify(videos));
  res.send('Video uploaded');
});

app.get('/videos', (req, res) => {
  res.json(videos);
});

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

http.listen(PORT, () => {
  console.log(`IsmisTube server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`Access at: http://localhost:${PORT}`);
});