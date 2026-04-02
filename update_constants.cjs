const fs = require('fs');
let content = fs.readFileSync('constants.ts', 'utf8');
content = content.replace(/rgbSplit: (true|false)/g, 'rgbSplit: $1, crimsonPop: false, bloodPulse: false, redChannelGlitch: false');
fs.writeFileSync('constants.ts', content);
