const fs = require('fs');
const files = ['faculty.js', 'subjects.js', 'rooms.js', 'groups.js', 'config.js', 'timetable.js', 'publish.js'];
files.forEach(f => {
  let content = fs.readFileSync('routes/' + f, 'utf8');
  content = content.replace(/router\.(get|post|put|delete)\('([^']+)', \((req, res)\) => \{/g, 'router.(\'\', async (req, res) => {');
  content = content.replace(/const data = readDB\(\);/g, 'const data = await readDB(req.userId || \"default\");');
  content = content.replace(/writeDB\(data\);/g, 'await writeDB(req.userId || \"default\", data);');
  content = content.replace(/res\.json\(readDB\(\)\.(faculty|subjects|rooms|groups|config|timetable)\);/g, 
    'res.json((await readDB(req.userId || \"default\")).);');
  fs.writeFileSync('routes/' + f, content);
  console.log('Fixed ', f);
});
