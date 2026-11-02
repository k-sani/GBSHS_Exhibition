import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const source = readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
class Element {
  constructor(){this.hidden=false;this.textContent='';this.innerHTML='';this.value='';this.open=false;this.disabled=false;this.dataset={};this.children=[];this.listeners={};this.isConnected=true;this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(){}
  querySelector(){return this.count ??= new Element();}
  addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}
  showModal(){this.open=true;}
  close(){this.open=false;for(const callback of this.listeners.close??[])callback();}
  focus(){}
  replaceChildren(...children){this.children=children;}
  appendChild(child){this.children.push(child);}
}
const fixtureCategories=['photo','poem','music','art','card','video'];
const fixtures=Array.from({length:18},(_,i)=>({id:`work-${String(i+1).padStart(2,'0')}`,student:String(1101+i),author:'Example author',title:'Example '+i,category:fixtureCategories[i%6],mimeType:'application/pdf',previewUrl:'https://drive.google.com/file/d/fixturefile'+i+'/preview',thumbnailUrl:'https://drive.google.com/thumbnail?id=fixturefile'+i,sourceUrl:'https://drive.google.com/file/d/fixturefile'+i+'/view'}));
function launch(selections=[],search='',records=fixtures){
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],new Element()]));
  const buttons = ['all','photo','poem','music','art','card','video','other'].map(category=>Object.assign(new Element(),{dataset:{category}}));
  const document={createElement(){return new Element();},querySelector(selector){const node=nodes.get(selector.slice(1));if(!node)throw new Error(`Missing element ${selector}`);return node;},querySelectorAll(selector){assert.equal(selector,'.category-button');return buttons;},body:new Element(),activeElement:new Element()};
  const history={url:'',replaceState(_state,_title,url){this.url=url;}};
  const context=vm.createContext({document,history,location:{protocol:'https:',pathname:'/gallery',search,hash:''},window:{EXHIBITION_CATALOG:records,addEventListener(){}},URLSearchParams});
  const script=source.replace('const awardSelections = [];',`const awardSelections = ${JSON.stringify(selections)};`);
  vm.runInContext(script+'\nglobalThis.app={state,artworks,awardedArtworks,render,showWork,moveWork};',context);
  return {app:context.app,nodes,history};
}

const initial=launch();
assert.equal(initial.nodes.get('awards-status').textContent,'선정 예정');
assert.equal(initial.nodes.get('awards-empty').hidden,false);
assert.equal(initial.nodes.get('awards-grid').hidden,true);
assert.equal(initial.app.artworks.length,18);
assert.doesNotMatch(initial.nodes.get('artwork-grid').innerHTML,/award-badge/);

const selected=launch([{id:'work-03',note:'선정 의견'},{id:'work-01'},{id:'work-01'},{id:'unknown'}]);
assert.deepEqual(Array.from(selected.app.awardedArtworks(),work=>work.id),['work-03','work-01']);
assert.equal(selected.nodes.get('awards-status').textContent,'2점 선정');
assert.equal(selected.nodes.get('awards-empty').hidden,true);
assert.equal(selected.nodes.get('awards-grid').hidden,false);
assert.equal((selected.nodes.get('awards-grid').innerHTML.match(/class="artwork-open"/g)||[]).length,2);
assert.equal((selected.nodes.get('artwork-grid').innerHTML.match(/award-badge--card/g)||[]).length,2);
assert.equal(selected.app.artworks.length,18);

// Featured navigation is independent of the main gallery's filters and search.
selected.app.state.category='video';
selected.app.state.query='no matching title';
selected.app.render();
assert.equal(selected.nodes.get('artwork-grid').innerHTML,'');
selected.app.showWork('work-03',true,'awards');
assert.equal(selected.nodes.get('dialog-award').hidden,false);
assert.equal(selected.nodes.get('dialog-award-note').textContent,'선정 의견');
assert.equal(selected.nodes.get('artwork-position').textContent,'01 / 02');
assert.equal(selected.nodes.get('previous-artwork').disabled,true);
assert.match(selected.history.url,/collection=awards/);
selected.app.moveWork(1);
assert.equal(selected.app.state.selected,'work-01');
assert.equal(selected.nodes.get('next-artwork').disabled,true);
assert.equal(selected.nodes.get('dialog-award-note').hidden,true);
assert.equal(selected.nodes.get('dialog-award-note').textContent,'');
selected.app.moveWork(1);
assert.equal(selected.app.state.selected,'work-01');
selected.nodes.get('artwork-dialog').close();
assert.equal(selected.app.state.selected,null);
assert.doesNotMatch(selected.history.url,/collection=awards/);

// A regular work must never inherit the previous winner's label or comment.
selected.app.showWork('work-02',true,'gallery');
assert.equal(selected.nodes.get('dialog-award').hidden,true);
assert.equal(selected.nodes.get('dialog-award-note').textContent,'');

const shared=launch([{id:'work-03'},{id:'work-01'}],'?type=video&work=work-03&collection=awards');
assert.equal(shared.app.state.dialogCollection,'awards');
assert.equal(shared.nodes.get('artwork-position').textContent,'01 / 02');
const unselectedLink=launch([],'?work=work-03&collection=awards');
assert.equal(unselectedLink.app.state.dialogCollection,'gallery');
assert.equal(unselectedLink.nodes.get('dialog-award').hidden,true);
console.log('Passed: pending state, selection labels, gallery preservation, invalid IDs, winner navigation, comments, shared links.');

const catalogPath=new URL('../private/catalog.json',import.meta.url);
if(existsSync(catalogPath)){
  const catalog=JSON.parse(readFileSync(catalogPath,'utf8'));
  const live=launch([],'',catalog.works);
  assert.equal(live.app.artworks.length,catalog.includedCount);
  assert.equal(live.app.awardedArtworks().length,catalog.awardCount);
  assert.equal(new Set(catalog.works.map(work=>work.student)).size,catalog.works.length);
  assert.equal(live.nodes.get('drive-viewer').children.length,0,'No media loads before selecting a work');
  assert.equal((live.nodes.get('artwork-grid').innerHTML.match(/class="artwork-open"/g)||[]).length,catalog.works.length);
  live.app.showWork(catalog.works[0].id,true,'gallery');
  assert.equal(live.nodes.get('drive-viewer').children.length,1);
  assert.equal(live.nodes.get('drive-viewer').children[0].src,catalog.works[0].previewUrl);
  live.app.moveWork(1);
  assert.equal(live.nodes.get('drive-viewer').children.length,1,'Only one viewer may be active');
  assert.equal(live.nodes.get('source-link').href,catalog.works[1].sourceUrl);
  live.nodes.get('artwork-dialog').close();
  assert.equal(live.nodes.get('drive-viewer').children.length,0,'Closing a work stops its media');
  for(const category of ['photo','poem','music','art','card','video','other']){
    live.app.state.category=category;live.app.render();
    assert.equal((live.nodes.get('artwork-grid').innerHTML.match(/class="artwork-open"/g)||[]).length,catalog.works.filter(work=>work.category===category).length);
  }
  const audit=JSON.parse(readFileSync(new URL('../private/submission-audit.json',import.meta.url),'utf8'));
  const held=new Set(audit.held.map(row=>row.student));
  assert.ok(catalog.works.every(work=>!held.has(work.student)));
  for(const row of audit.included){
    const expected=row.colored.some(cell=>!['default','255,255,255','248,249,250'].includes(cell.entered));
    assert.equal(Boolean(catalog.works.find(work=>work.student===row.student).award),expected);
  }
  console.log(`Passed: ${catalog.works.length} real works, ${catalog.awardCount} awards, all seven categories, held IDs excluded, manual colors only, lazy viewers and media cleanup.`);
}
