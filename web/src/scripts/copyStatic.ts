import * as fs from 'fs';
import * as path from 'path';

const sourceDir = path.join(__dirname, '../static');
const targetDir = path.join(__dirname, '../../dist/static');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy all files from static directory
fs.readdirSync(sourceDir).forEach(file => {
  fs.copyFileSync(
    path.join(sourceDir, file),
    path.join(targetDir, file)
  );
});

console.log('Static files copied successfully!');