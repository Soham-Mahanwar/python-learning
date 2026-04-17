import { execSync } from 'child_process';
try {
  console.log(execSync('ps -ef | grep node').toString());
} catch (e) {
  console.log(e.message);
}
