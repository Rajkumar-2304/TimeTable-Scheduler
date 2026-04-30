const fs = require('fs');
const files = ['faculty.js', 'subjects.js', 'rooms.js', 'groups.js', 'config.js', 'timetable.js', 'publish.js'];

files.forEach(f => {
  let content = fs.readFileSync('routes/' + f, 'utf8');
  let match = content.match(/res\.json\(\(await readDB\(req\.userId \|\| "default"\)\)\.\);/);
  if (match) {
     const prop = f.replace('.js', '');
     // fix syntax error
     content = content.replace(/res\.json\(\(await readDB\(req\.userId \|\| "default"\)\)\.\);/g, 'res.json((await readDB(req.userId || "default")).' + prop + ');');
     fs.writeFileSync('routes/' + f, content);
     console.log('Fixed ' + f);
  }
});
