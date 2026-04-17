import { execSync } from 'child_process';
try {
  console.log('pip3:', execSync('pip3 --version').toString());
} catch (e) {
  console.log('pip3 not found');
}
try {
  console.log('python3 -m pip:', execSync('python3 -m pip --version').toString());
} catch (e) {
  console.log('python3 -m pip not found');
}
