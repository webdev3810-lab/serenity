const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '.next', 'server', 'app', 'page.js.map');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
console.log(map.sources);
