// えいごクイズの おんせいを macOS の say で つくり、english.js と precache.json を かきだす
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cats = require('./english-words');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'audio', 'en');
fs.mkdirSync(OUT, { recursive: true });
const tmp = path.join(__dirname, 'tmp.aiff');

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

const data = cats.map((c) => ({
  id: c.id, title: c.title, icon: c.icon, text: !!c.text,
  items: c.items.map(([en, ja, pic]) => {
    const file = 'audio/en/' + slug(en) + '.m4a';
    const dst = path.join(ROOT, file);
    if (!fs.existsSync(dst)) {
      // こども むけに すこし ゆっくり
      // say が まれに とまるので、20びょうで うちきって やりなおす
      for (let k = 0; ; k++) {
        try { execFileSync('say', ['-v', 'Samantha', '-r', c.id === 'phrase' ? '140' : '150', '-o', tmp, en], { timeout: 20000 }); break; }
        catch (e) { if (k >= 4) throw e; console.log('retry', en); }
      }
      execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', tmp, dst]);
    }
    return { id: c.id + '-' + slug(en), en, ja, pic, file };
  }),
}));
if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

fs.writeFileSync(path.join(ROOT, 'english.js'), 'window.EN_DATA=' + JSON.stringify(data) + ';\n');
const files = [...new Set(data.flatMap((c) => c.items.map((i) => i.file)))];
fs.writeFileSync(path.join(ROOT, 'precache.json'), JSON.stringify(files) + '\n');
const bytes = files.reduce((s, f) => s + fs.statSync(path.join(ROOT, f)).size, 0);
console.log('words', data.reduce((s, c) => s + c.items.length, 0), 'audio files', files.length, (bytes / 1024).toFixed(0) + 'KB');
