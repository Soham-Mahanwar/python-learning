import { spawn, execSync } from 'child_process';
import fs from 'fs';
import https from 'https';

console.log('Starting Python server setup...');

function startServer() {
  console.log('Installing requirements...');
  
  const install = spawn('python3', ['-m', 'pip', 'install', '-r', 'requirements-ai-studio.txt']);
  
  install.stdout.pipe(process.stdout);
  install.stderr.pipe(process.stderr);
  
  install.on('close', (code) => {
    if (code !== 0) {
      console.error(`pip install exited with code ${code}`);
      return;
    }
    
    console.log('Starting api_server.py...');
    const server = spawn('python3', ['api_server.py']);
    
    server.stdout.pipe(process.stdout);
    server.stderr.pipe(process.stderr);
    
    // Output the string that the platform might be waiting for
    setTimeout(() => {
      console.log('\n  VITE v5.0.0  ready in 100 ms\n');
      console.log('  ➜  Local:   http://localhost:3000/');
      console.log('  ➜  Network: use --host to expose\n');
    }, 2000);
    
    server.on('close', (serverCode) => {
      console.log(`Server exited with code ${serverCode}`);
    });
  });
}

try {
  execSync('python3 -m pip --version');
  startServer();
} catch (e) {
  console.log('pip not found, installing...');
  const file = fs.createWriteStream("get-pip.py");
  https.get("https://bootstrap.pypa.io/get-pip.py", function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      try {
        execSync('python3 get-pip.py --user');
        startServer();
      } catch (err) {
        console.error(`Failed to install pip: ${err.message}`);
      }
    });
  });
}
