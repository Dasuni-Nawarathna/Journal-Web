const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'Workspace.tsx');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('Scrapbook Sticker Drawer')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
      for (let i = idx - 10; i <= idx + 50; i++) {
        console.log(`  ${i + 1}: ${lines[i]}`);
      }
    }
  });
} else {
  console.log('Workspace.tsx not found');
}
