const fs = require('fs');
let content = fs.readFileSync('routes/faculty.js', 'utf8');
content = content.replace(/res\.json\(\(await readDB\(req\.userId \|\| "default"\)\)\.\);/g, 'res.json((await readDB(req.userId || "default")).faculty);');
fs.writeFileSync('routes/faculty.js', content);
