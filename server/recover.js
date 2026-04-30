const fs = require('fs');

// standard CRUD files
const crud = ['faculty.js', 'subjects.js', 'rooms.js', 'groups.js'];
crud.forEach(f => {
  let content = fs.readFileSync('routes/' + f, 'utf8');
  let i = 0;
  content = content.replace(/router\.\('', async \(req, res\) => \{/g, () => {
    const paths = ["get('/',", "post('/',", "put('/:id',", "delete('/:id',"];
    return `router.${paths[i++]} async (req, res) => {`;
  });
  fs.writeFileSync('routes/' + f, content);
});

// config.js
let c = fs.readFileSync('routes/config.js', 'utf8');
let j = 0;
c = c.replace(/router\.\('', async \(req, res\) => \{/g, () => {
  const paths = ["get('/',", "put('/',"];
  return `router.${paths[j++]} async (req, res) => {`;
});
fs.writeFileSync('routes/config.js', c);

// timetable.js
let t = fs.readFileSync('routes/timetable.js', 'utf8');
let k = 0;
t = t.replace(/router\.\('', async \(req, res\) => \{/g, () => {
  const paths = ["get('/',", "post('/generate',"];
  return `router.${paths[k++]} async (req, res) => {`;
});
fs.writeFileSync('routes/timetable.js', t);

// publish.js
let p = fs.readFileSync('routes/publish.js', 'utf8');
p = p.replace(/router\.\('', async \(req, res\) => \{/g, "router.post('/', async (req, res) => {");
fs.writeFileSync('routes/publish.js', p);

console.log('Restored paths successfully');
