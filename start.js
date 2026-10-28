const { spawn } = require('child_process');
const path = require('path');

console.log('Starting CogniTrace backend FastAPI server...');
const backend = spawn('python', ['run.py'], {
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: 'inherit'
});

console.log('Starting CogniTrace frontend Vite server...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  shell: true,
  stdio: 'inherit'
});

// Handle graceful termination
const cleanExit = () => {
  console.log('\nStopping servers...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
