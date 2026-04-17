import { execSync } from 'child_process';
try {
  console.log(execSync('ps -ef | grep python').toString());
} catch (e) {
  console.log(e.message);
}
