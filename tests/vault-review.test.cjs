const test=require('node:test'), assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
function setup(overrides={}){const events={},stored={};const ctx={crypto:webcrypto,localStorage:{getItem:k=>stored[k]||null,setItem:(k,v)=>stored[k]=v},Date,setInterval(){},URL,Uint8Array,console,render(){},vault(){},feed(){},stories(){},profile(){},path:()=>'/vault',s:{name:'Test Member',visibility:'members',points:0},level:()=>1,esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),profileAwardCounts:()=>({}),profileAwardBanner:()=>'<aside>counts</aside>',document:{addEventListener:(k,fn)=>(events[k]??=[]).push(fn),querySelector:()=>null,querySelectorAll:()=>[]},window:{addEventListener(){}},save(){},toast(){},confirm:()=>true};Object.assign(ctx,overrides);vm.createContext(ctx);let source=fs.readFileSync('test/vault-social.js','utf8').replace(/render\(\);\n\}\)\(\);\s*$/,'globalThis.testing={data,activeStories,home,post,profileView,validateFile,uid,pendingFile:()=>pending,checking:()=>uploadChecking,setPhotoSource:file=>photoSource=file};\n})();');if(overrides.validateUpload)source=source.replace('async function validateFile(file){','async function validateFile(file){return validateUpload(file);/*').replace('return file}\nfunction showPhotoCrop','return file}*/}\nfunction showPhotoCrop');if(overrides.storeMedia)source=source.replace(/async function mediaStore\(method,key,value\)\{[\s\S]*?\nasync function hydrate/,'async function mediaStore(method,key,value){return storeMedia(method,key,value)}\nasync function hydrate');vm.runInContext(source,ctx);return {ctx,events,t:ctx.testing,click:async(vs,id)=>{for(const fn of events.click||[])await fn({target:{closest:()=>({dataset:{vs,id}})}})}}}
test('stories hide at the exact 24 hour boundary',()=>{const {t}=setup();const now=Date.now();t.data.stories=[{at:now-86400000,id:'expired'},{at:now-1000,id:'active'}];assert.deepEqual(Array.from(t.activeStories(),x=>x.id),['active']);});
test('follow is reversible and never creates duplicate followers or points',async()=>{const {click,t,ctx}=setup();await click('follow','alex');assert.equal(t.data.following.length,1);await click('follow','alex');assert.equal(t.data.following.length,0);await click('follow','alex');assert.equal(t.data.following.length,1);assert.equal(ctx.s.points,0);});
test('unknown members cannot be followed',async()=>{const {click,t}=setup();await click('follow','unknown');assert.equal(t.data.following.length,0);});
test('likes toggle without awarding progress points',async()=>{const {click,t,ctx}=setup();await click('like','demo-alex');assert.equal(t.data.likes.length,1);await click('like','demo-alex');assert.equal(t.data.likes.length,0);assert.equal(ctx.s.points,0);});
test('post content and bios are escaped',()=>{const {t}=setup();assert.ok(t.post({author:'me',id:'x',text:'<script>alert(1)</script>',type:'post'}).includes('&lt;script&gt;'));t.data.bio='<img onerror=alert(1)>';assert.ok(!t.profileView().includes('<img onerror'));});
test('sample members never expose delete controls',()=>{const {t}=setup();assert.ok(!t.post({author:'alex',id:'x',text:'x'}).includes('data-vs="delete"'));assert.ok(t.post({author:'me',id:'x',text:'x'}).includes('data-vs="delete"'));});
test('uploads reject unsupported formats and oversize files',async()=>{const {t}=setup();await assert.rejects(t.validateFile({type:'text/html',size:10}),/Choose a JPG/);await assert.rejects(t.validateFile({type:'video/mp4',size:21*1024*1024}),/smaller than 20 MB/);await assert.rejects(t.validateFile({type:'image/png',size:11*1024*1024}),/smaller than 10 MB/);});
test('IDs work without crypto.randomUUID',()=>{const {t}=setup();const ids=new Set(Array.from({length:100},()=>t.uid()));assert.equal(ids.size,100);});

function uploadSetup(){
const jobs=new Map(),nodes={
 'vs-error':{textContent:'',isConnected:true},
 'vs-media-preview':{replaceChildren(){},append(){}},
 'vs-dialog':{addEventListener(){}}
},button={disabled:false,isConnected:true};
const fixture=setup({validateUpload:file=>new Promise((resolve,reject)=>jobs.set(file.name,{resolve:()=>resolve(file),reject})),URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}});
fixture.ctx.document.getElementById=id=>nodes[id];fixture.ctx.document.createElement=()=>({});
const input={id:'vs-upload',files:[],isConnected:true,closest:()=>({querySelector:()=>button})};
return {...fixture,jobs,nodes,button,input,select(file){input.files=[file];return fixture.events.change[0]({target:input})}};
}
test('only the latest selected upload wins when checks complete out of order',async()=>{
const f=uploadSetup(),first={name:'first.jpg',type:'image/jpeg'},second={name:'second.jpg',type:'image/jpeg'};
const a=f.select(first),b=f.select(second);assert.equal(f.button.disabled,true);
f.jobs.get(second.name).resolve();await b;assert.equal(f.t.pendingFile(),second);assert.equal(f.button.disabled,false);
f.jobs.get(first.name).resolve();await a;assert.equal(f.t.pendingFile(),second);assert.equal(f.nodes['vs-error'].textContent,second.name);
});
test('an old upload failure cannot overwrite the newer successful selection',async()=>{
const f=uploadSetup(),first={name:'bad.jpg',type:'image/jpeg'},second={name:'good.jpg',type:'image/jpeg'};
const a=f.select(first),b=f.select(second);f.jobs.get(second.name).resolve();await b;
f.jobs.get(first.name).reject(Error('Old failure'));await a;assert.equal(f.nodes['vs-error'].textContent,second.name);assert.equal(f.t.pendingFile(),second);
});
test('closing the composer during validation never attaches the pending file',async()=>{
const f=uploadSetup(),file={name:'photo.jpg',type:'image/jpeg'},job=f.select(file);f.input.isConnected=false;
f.jobs.get(file.name).resolve();await job;assert.equal(f.t.pendingFile(),null);assert.equal(f.t.checking(),false);
});

test('saving a crop preserves its original and removes the previous original only after success',async()=>{
const media=new Map([['old-original','old photo']]);
const f=setup({storeMedia:async(method,key,value)=>method==='put'?media.set(key,value):media.delete(key)});
f.t.data.photo='old crop';f.t.data.photoOriginalId='old-original';f.t.setPhotoSource('new original');
f.ctx.document.getElementById=id=>id==='vs-canvas'?{toDataURL:()=> 'new crop'}:{close(){}};
await f.click('save-crop');assert.equal(f.t.data.photo,'new crop');assert.equal(media.get(f.t.data.photoOriginalId),'new original');assert.equal(media.has('old-original'),false);
});
test('a storage failure restores the old crop and original instead of claiming success',async()=>{
const media=new Map([['old-original','old photo']]);
const f=setup({storeMedia:async(method,key,value)=>method==='put'?media.set(key,value):media.delete(key),localStorage:{getItem:()=>null,setItem(){throw Error('full')}}});
f.t.data.photo='old crop';f.t.data.photoOriginalId='old-original';f.t.setPhotoSource('new original');
f.ctx.document.getElementById=id=>id==='vs-canvas'?{toDataURL:()=> 'new crop'}:{close(){throw Error('must not close')}};
await f.click('save-crop');assert.equal(f.t.data.photo,'old crop');assert.equal(f.t.data.photoOriginalId,'old-original');assert.deepEqual([...media.entries()],[['old-original','old photo']]);
});
