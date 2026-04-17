import { execSync } from 'child_process';
try {
  console.log('ensurepip:', execSync('python3 -m ensurepip').toString());
} catch (e) {
  console.log('ensurepip failed', e.message);
}
