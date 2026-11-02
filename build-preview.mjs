import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = new URL('./', import.meta.url);
const [html,css,js,svg] = await Promise.all(['dist/index.html','dist/styles.css','dist/app.js','dist/favicon.svg'].map(file=>readFile(new URL(file,root),'utf8')));
new vm.Script(js,{filename:'app.js'});
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML IDs');
for (const match of js.matchAll(/querySelector\("#([^"]+)"\)/g)) if(!ids.includes(match[1])) throw new Error(`Missing element: ${match[1]}`);
if (/https?:\/\//.test(html+css+js)) throw new Error('Unexpected external dependency');
if ((css.match(/{/g)||[]).length !== (css.match(/}/g)||[]).length) throw new Error('CSS brace imbalance');
const standalone = html.replace('<link rel="stylesheet" href="./styles.css">',`<style>\n${css}\n</style>`)
  .replace('<script src="./app.js" defer></script>','')
  .replace('<link rel="icon" type="image/svg+xml" href="./favicon.svg">',`<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(svg)}">`)
  .replace('</body>',`<script>\n${js}\n</script>\n</body>`);
const directory = new URL('outputs/',root);
await mkdir(directory,{recursive:true});
const target = new URL('exhibition-draft.html',directory);
await writeFile(target,standalone,'utf8');
console.log(JSON.stringify({status:'passed',checks:['JavaScript syntax','HTML element references','unique IDs','CSS brace balance','no external dependencies'],output:fileURLToPath(target),bytes:Buffer.byteLength(standalone)}));
