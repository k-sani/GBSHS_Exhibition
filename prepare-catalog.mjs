import {readFile,writeFile,access} from 'node:fs/promises';

export async function prepareCatalog(){
  let catalog;
  try {catalog=JSON.parse(await readFile(new URL('./private/catalog.json',import.meta.url),'utf8'));}
  catch(error){if(error.code==='ENOENT')throw new Error('Place your separately saved catalog at private/catalog.json before building or serving.');throw error;}
  if(!Array.isArray(catalog.works))throw new Error('Catalog must contain a works array.');
  const ids=new Set();
  const students=new Set();
  const categories=new Set(['photo','poem','music','art','card','video','other']);
  for(const work of catalog.works){
    if(work.thumbnailUrl?.startsWith('./')){
      if(work.thumbnailUrl!==`./thumbnails/${work.student}.webp`)throw new Error('Unexpected local thumbnail path.');
      await access(new URL('./dist/'+work.thumbnailUrl.slice(2),import.meta.url));
    }else if(work.thumbnailUrl&&work.thumbnailUrl!=='https://drive.google.com/thumbnail?id='+work.fileId+'&sz=w640')throw new Error('Unexpected remote thumbnail URL.');
  }
  const works=catalog.works.map(work=>{
    if(!/^\d{4}$/.test(work.student)||students.has(work.student))throw new Error('Student IDs must be unique four-digit strings.');
    if(ids.has(work.id)||work.id!=='student-'+work.student)throw new Error('Artwork IDs must be unique and stable.');
    if(!categories.has(work.category)||!work.author?.trim())throw new Error('Missing category or author.');
    if(!/^[A-Za-z0-9_-]{10,100}$/.test(work.fileId))throw new Error('Invalid Drive file identifier.');
    const source=new URL(work.sourceUrl);
    if(source.origin!=='https://drive.google.com'||!source.pathname.startsWith('/file/d/'+work.fileId+'/'))throw new Error('Unexpected artwork source.');
    ids.add(work.id);students.add(work.student);
    // Omit original filenames, timestamps and audit details from the display data.
    return {id:work.id,student:work.student,author:work.author,title:work.title,category:work.category,mimeType:work.mimeType,sourceUrl:work.sourceUrl,previewUrl:'https://drive.google.com/file/d/'+work.fileId+'/preview',thumbnailUrl:work.thumbnailUrl||'https://drive.google.com/thumbnail?id='+work.fileId+'&sz=w640',award:work.award?{label:'우수작',...(work.award.note?{note:String(work.award.note)}:{})}:null};
  });
  const json=JSON.stringify(works).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const source='"use strict";\nwindow.EXHIBITION_CATALOG = '+json+';\n';
  await writeFile(new URL('./dist/catalog.js',import.meta.url),source,'utf8');
  return {source,works};
}
