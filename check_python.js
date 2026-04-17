import { execSync } from 'child_process';
try {
  console.log('python:', execSync('python --version').toString());
} catch (e) {
  console.log('python not found');
}
try {
  console.log('python3:', execSync('python3 --version').toString());
} catch (e) {
  console.log('python3 not found');
}
