const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Custom environment config loader
// Modify loadConfig function
function loadConfig() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join(process.execPath, '..', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      break;
    }
  }
}

loadConfig();
const jdRoutes = require('./routes/jdRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
let PORT = process.env.PORT || 3000;

// Function to find an available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.close();
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });

    server.listen(startPort, () => {
      server.close();
      resolve(startPort);
    });
  });
};

// Start the server
async function startServer() {
  try {
    // Add cookie-parser middleware
    app.use(cookieParser());
    
    // Configure view engine and middleware
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(express.static('public'));
    app.use('/', jdRoutes);
    app.use('/', jobRoutes);  // Add this line to mount the job routes

    // Find available port
    PORT = await findAvailablePort(PORT);
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`Server đang chạy trên http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();