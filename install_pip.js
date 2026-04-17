import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';

const file = fs.createWriteStream("get-pip.py");
https.get("https://bootstrap.pypa.io/get-pip.py", function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    try {
      console.log(execSync('python3 get-pip.py --user').toString());
      console.log(execSync('python3 -m pip --version').toString());
    } catch (e) {
      console.error(e.message);
    }
  });
});
