const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '.next', 'server', 'app', 'page.js.map');
if (!fs.existsSync(mapPath)) {
  console.log("No source map found at", mapPath);
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const index = map.sources.findIndex(s => s.includes('page.tsx'));
if (index === -1) {
  console.log("page.tsx not found in sources");
  process.exit(1);
}

const content = map.sourcesContent[index];
fs.writeFileSync(path.join(__dirname, 'recovered_page.tsx'), content);
console.log("Recovered page.tsx! Wrote to recovered_page.tsx");
