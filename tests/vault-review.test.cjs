const test=require('node:test'), assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
function setup(overrides={}){const events={},stored={};const ctx={crypto:webcrypto,localStorage:{getItem:k=>stored[k]||null,setItem:(k,v)=>stored[k]=v},Date,setInterval(){},URL,Uint8Array,console,render(){},vault(){},feed(){},stories(){},profile(){},path:()=>'/vault',s:{name:'Test Member',visibility:'members',points:0},level:()=>1,esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),profileAwardCounts:()=>({}),profileAwardBanner:()=>'<aside>counts</aside>',document:{addEventListener:(k,fn)=>(events[k]??=[]).push(fn),querySelector:()=>null,querySelectorAll:()=>[]},window:{addEventListener(){}},save(){},toast(){},confirm:()=>true};Object.assign(ctx,overrides);vm.createContext(ctx);let source=fs.readFileSync('test/vault-social.js','utf8').replace(/render\(\);\n\}\)\(\);\s*$/,'globalThis.testing={data,activeStories,home,post,profileView,validateFile,uid,pendingFile:()=>pending,checking:()=>uploadChecking,setPhotoSource:file=>photoSource=file,storyStrip,reels,saveEntry,editableItem,visibleFriendStories,cleanTags,tagLinks,tagPicker};\n})();');if(overrides.validateUpload)source=source.replace('async function validateFile(file){','async function validateFile(file){return validateUpload(file);/*').replace('return file}\nfunction showPhotoCrop','return file}*/}\nfunction showPhotoCrop');if(overrides.storeMedia)source=source.replace(/async function mediaStore\(method,key,value\)\{[\s\S]*?\nasync function hydrate/,'async function mediaStore(method,key,value){return storeMedia(method,key,value)}\nasync function hydrate');vm.runInContext(source,ctx);return {ctx,events,t:ctx.testing,click:async(vs,id)=>{for(const fn of events.click||[])await fn({target:{closest:()=>({dataset:{vs,id}})}})}}}
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

test('profile has one reels circle and one story circle before the profile details',()=>{
const {t}=setup();const html=t.profileView();assert.equal((html.match(/data-vs="manage-reels"/g)||[]).length,1);assert.equal((html.match(/data-vs="manage-stories"/g)||[]).length,1);assert.ok(html.indexOf('vs-stories')<html.indexOf('vs-profile-head'));
assert.equal((t.reels().match(/data-vs="manage-reels"/g)||[]).length,1);
});
test('friends stories track the followed members and disappear on unfollow',async()=>{
const {t,click}=setup();assert.equal(t.visibleFriendStories().length,0);await click('follow','alex');assert.deepEqual(Array.from(t.visibleFriendStories(),x=>x.author),['alex']);assert.match(t.storyStrip(),/Sample story/);await click('follow','alex');assert.equal(t.visibleFriendStories().length,0);
});
test('editing a reel preserves its identity, media and likes',()=>{
const {t}=setup();const old={id:'reel-1',type:'reel',author:'me',text:'Before',at:100,media:'video-1',mime:'video/mp4'};t.data.posts=[old];t.data.likes=['reel-1'];const result=t.saveEntry('reel','After',old,null,null);assert.equal(t.data.posts.length,1);assert.equal(result.id,old.id);assert.equal(result.at,old.at);assert.equal(result.media,old.media);assert.equal(result.text,'After');assert.equal(t.data.likes[0],old.id);
});
test('replacing a story photo keeps its original expiry time',()=>{
const {t}=setup();const old={id:'story-1',type:'story',author:'me',text:'Before',at:Date.now()-3600000,media:'old',mime:'image/png'};t.data.stories=[old];const result=t.saveEntry('story','After',old,{type:'image/jpeg'},'replacement');assert.equal(result.at,old.at);assert.equal(result.media,'replacement');assert.equal(result.mime,'image/jpeg');
});
test('expired stories and other members content cannot be edited',()=>{
const {t}=setup();const old={id:'expired',author:'me',type:'story',at:Date.now()-86400000};t.data.stories=[old];assert.equal(t.editableItem('story','expired'),undefined);assert.throws(()=>t.saveEntry('story','x',old,null,null),/no longer available/);t.data.posts=[{id:'other',author:'alex',type:'reel'}];assert.equal(t.editableItem('reel','other'),undefined);
});
test('failed edits restore the previous story',()=>{
const {t}=setup({localStorage:{getItem:()=>null,setItem(){throw Error('full')}}});const old={id:'s',author:'me',type:'story',at:Date.now(),text:'Keep this'};t.data.stories=[old];assert.throws(()=>t.saveEntry('story','Changed',old,null,null),/full/);assert.equal(t.data.stories[0],old);
});

test('member tags discard unknown IDs and duplicates',()=>{const {t}=setup();assert.deepEqual(Array.from(t.cleanTags(['alex','alex','unknown','sam'])),['alex','sam']);assert.deepEqual(Array.from(t.cleanTags(null)),[]);});
test('tagged reels keep tags on caption edits and allow tags to be removed',()=>{const {t}=setup();const item=t.saveEntry('reel','First',null,{type:'video/mp4'},'video',['alex']);const updated=t.saveEntry('reel','Edited',item,null,null);assert.equal(updated.tags[0],'alex');const cleared=t.saveEntry('reel','Edited',updated,null,null,[]);assert.equal(cleared.tags.length,0);assert.equal(cleared.media,'video');});
test('story tags link to member profiles and populate the editor',()=>{const {t}=setup();const item=t.saveEntry('story','Hello',null,null,null,['sam']);assert.match(t.tagLinks(item),/href="#\/vault\/member\/sam"/);assert.match(t.tagPicker(item),/value="sam" checked/);assert.equal(t.tagLinks({tags:['unknown']}),'');});
