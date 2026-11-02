import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const source = readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
class Element {
  constructor(){this.hidden=false;this.textContent='';this.innerHTML='';this.value='';this.open=false;this.disabled=false;this.dataset={};this.listeners={};this.isConnected=true;this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(){}
  querySelector(){return this.count ??= new Element();}
  addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}
  showModal(){this.open=true;}
  close(){this.open=false;for(const callback of this.listeners.close??[])callback();}
  focus(){}
}
function launch(selections=[],search=''){
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],new Element()]));
  const buttons = ['all','photo','poem','music','art','card','video'].map(category=>Object.assign(new Element(),{dataset:{category}}));
  const document={querySelector(selector){const node=nodes.get(selector.slice(1));if(!node)throw new Error(`Missing element ${selector}`);return node;},querySelectorAll(selector){assert.equal(selector,'.category-button');return buttons;},body:new Element(),activeElement:new Element()};
  const history={url:'',replaceState(_state,_title,url){this.url=url;}};
  const context=vm.createContext({document,history,location:{protocol:'https:',pathname:'/gallery',search,hash:''},window:{addEventListener(){}},URLSearchParams});
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
