const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'Workspace.tsx');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 1390; i < Math.min(lines.length, 1470); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('Workspace.tsx not found');
}
