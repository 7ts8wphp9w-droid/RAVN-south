/* Review build: all social data stays on this browser. No shared accounts. */
(() => {
'use strict';
const KEY='ravn-vault-review-v1', DAY=86400000;
const people=[{id:'alex',name:'Alex',bio:'Building a routine one session at a time.',topic:'Training'},{id:'sam',name:'Sam',bio:'Making everyday nutrition work around family life.',topic:'Nutrition'},{id:'jordan',name:'Jordan',bio:'Small steps, fresh air and a steadier mindset.',topic:'Mentality'}];
let data={bio:'',photo:'',showProgress:false,showAwards:false,following:[],likes:[],posts:[],stories:[]};
try{data={...data,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
let tab='all', mediaUrls=new Map(), pending=null, cropImage=null, photoSource=null, uploadVersion=0, uploadChecking=false;
const uid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
const persist=()=>{localStorage.setItem(KEY,JSON.stringify(data))};
const samples=[{id:'demo-alex',author:'alex',text:'Today’s win: I made time for the session I planned. Keeping the goal realistic made all the difference.',type:'post',at:0},{id:'demo-sam',author:'sam',text:'Prepared tomorrow’s lunch this evening. One less decision to make on a busy day.',type:'post',at:0},{id:'demo-jordan',author:'jordan',text:'A short walk and a moment to reflect. What small step helped you today?',type:'post',at:0}];
const friendStories=samples.map(x=>({...x,id:'story-'+x.author,type:'story',sample:true,at:Date.now()}));
const visibleFriendStories=()=>friendStories.filter(x=>data.following.includes(x.author)&&Date.now()-x.at<DAY);
const activeStories=()=>data.stories.filter(x=>Date.now()-x.at<DAY);
const member=id=>id==='me'?{id:'me',name:s.name,bio:data.bio}:people.find(p=>p.id===id);
const portrait=(id,size='')=>id==='me'&&data.photo?`<img class="vs-avatar ${size}" src="${data.photo}" alt="Your profile picture">`:`<span class="vs-avatar ${size}" aria-hidden="true">${esc((member(id)?.name||'Member').slice(0,1))}</span>`;
const photoButton=(size='')=>`<button type="button" class="vs-photo-button ${size}" data-vs="edit-photo" aria-label="${data.photo?'Edit profile picture':'Add profile picture'}" title="${data.photo?'Edit profile picture':'Add profile picture'}">${portrait('me',size)}<span class="vs-photo-edit" aria-hidden="true">${data.photo?'Edit':'+'}</span></button>`;
const glyphs={activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',place:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',feed:'<path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',reels:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m10 9 6 3-6 3Z M4 7h16 M8 3l3 4 M14 3l3 4"/>',challenge:'<path d="M2 9 6 5h12l4 4-4 4H6L2 9Z M2 9l2 8 4 3h8l4-3 2-8 M8 14l1 5 M16 14l-1 5 M7 9h10"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3 M16 5a3 3 0 0 1 0 6 M18 15a5 5 0 0 1 3 5"/>',profile:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',plus:'<path d="M12 4v16 M4 12h16"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',tag:'<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1"/>',trophy:'<path d="M8 3h8v7a4 4 0 0 1-8 0Z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v6 M7 21h10"/>',heart:'<path d="M20.5 5.5a5 5 0 0 0-8.5 2 5 5 0 0 0-8.5-2C-1 11 12 21 12 21s13-10 8.5-15.5Z"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',trash:'<path d="M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7"/>',check:'<path d="m4 12 5 5L20 6"/>'};
const icon=name=>`<svg class="rep-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]||glyphs.plus}</svg>`;
const navBar=()=>`<nav class="vs-nav rep-dock" aria-label="Repbook">${[['/repbook','Feed','feed'],['/repbook/reels','Reels','reels'],['/repbook/challenges','Arena','challenge'],['/repbook/members','People','people'],['/profile','Profile','profile']].map(([url,label,glyph])=>`<a href="#${url}" ${path()===url||url==='/repbook'&&path()==='/repbook/feed'?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span></a>`).join('')}</nav>`;
const intro=()=>`<header class="vs-heading rep-header"><a href="#/" class="rep-brand" aria-label="RAVN South home"><img src="./assets/ravn-angular-logo.png" alt="RAVN South"></a><h1>${path()==='/repbook/challenges'?'ARENA':'REPBOOK'}</h1><div class="rep-header-actions"><a class="rep-glass" href="#/repbook/members" aria-label="Find people">${icon('search')}</a><button class="rep-glass" data-vs="create" aria-label="Create a post">${icon('plus')}</button></div></header>${navBar()}<p class="vs-demo">Preview · saved on this device. Sample members are fictional.</p>`;
const wrap=body=>`<section class="section repbook-section"><div class="wrap vs-shell">${intro()}<input id="vs-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose profile picture">${body}</div></section>`;
window.ravnArenaProfile = () => ({name:s.name,bio:data.bio,picture:photoButton('vs-large')});
window.ravnArenaUpload = kind => composer('reel', null, kind);

function isVideoMedia(item){
 return item.mime ? item.mime.startsWith('video/') : item.type==='reel';
}
function previewTile(item,label) {
 const attrs=`class="rep-story-cover" data-media="${esc(item.media)}" aria-hidden="true"`;
 const video=isVideoMedia(item);
 const cover=!item.media?'':video
  ? `<img ${attrs} alt="" data-story-preview hidden><small data-preview-status>Loading preview…</small>`
  : `<img ${attrs} alt="">`;
 return `<button type="button" class="vs-story rep-own-story" data-vs="${item.type==='story'?'story':'media-menu'}" data-kind="${item.type}" data-id="${esc(item.id)}" aria-label="Open ${esc(label)}">
  ${cover}<strong>${esc(label)}</strong>${item.media?'':`<small>${esc(item.text)}</small>`}</button>`;
}
function reelCircle(){
 const reels=data.posts.filter(x=>x.type==='reel' && !x.arenaMode);
 if(reels.length)return reels.map(x=>previewTile(x,'Your reel')).join('');
 return `<button type="button" class="vs-story" data-vs="manage-reels" aria-label="Add or edit your reels"><span class="vs-story-ring vs-reel-ring" aria-hidden="true">${icon('reels')}</span><strong>Your reels</strong><small>Tap to add or edit</small></button>`;
}
window.ravnChallengePreviews=mode=>{
 const items=data.posts.filter(x=>x.type==='reel' && x.arenaMode===mode);
 if(!items.length)return '';
 const label=mode==='tag'?'Tag reel':'Reel challenge';
 return `<div class="vs-stories rep-challenge-previews" aria-label="${label} videos">${items.map(x=>previewTile(x,label)).join('')}</div>`;
};
function storyStrip(){const own=activeStories(),friends=visibleFriendStories();return `<div data-story-rows><section class="vs-stories" aria-label="Reels">${reelCircle()}</section><section class="vs-stories" aria-label="Stories">${own.map(x=>previewTile(x,'Your story')).join('')}<button type="button" class="vs-story" data-vs="add-media" data-kind="story" aria-label="Add your story"><span class="vs-story-ring">${icon('plus')}</span><strong>${own.length?'Add story':'Your story'}</strong><small>Tap to add</small></button>${friends.map(x=>`<button type="button" class="vs-story" data-vs="friend-story" data-id="${x.id}" aria-label="View ${esc(member(x.author).name)}’s sample story"><span class="vs-story-ring">${portrait(x.author)}</span><strong>${esc(member(x.author).name)}</strong><small>Sample story</small></button>`).join('')}<p>${friends.length?'Stories from people you follow.':'Friends’ stories appear here when you follow them.'}<br><small>Stories last 24 hours. Sample members are fictional.</small></p></section></div>`}
function manageMedia(kind){const items=kind==='story'?activeStories():data.posts.filter(x=>x.type==='reel');if(!items.length){composer(kind);return}mediaActions(items[0])}
function openStory(story){
 const id=story.id;
 const comments=()=>data.storyComments?.[id]||[];
 const dialog=openDialog(`${media(story)||`<p>${esc(story.text||'')}</p>`}
  <div class="vs-post-tools story-tools">
   <button type="button" class="rep-like" data-vs="like" data-id="${esc(id)}" aria-label="Like story" aria-pressed="${data.likes.includes(id)}">${icon('heart')}</button>
   <button type="button" class="btn-soft" data-comments-toggle aria-expanded="false">Comment</button>
  </div>
  <div data-comments hidden><ul aria-label="Story comments"></ul>
   <form><label>Comment<input name="comment" required maxlength="500" autocomplete="off"></label><button class="btn-soft">Post comment</button></form>
  </div>`,'View story');
 dialog.classList.add('story-player');
 const video=dialog.querySelector('video');
 if(video){video.muted=true;video.autoplay=true}
 hydrate();
 const panel=dialog.querySelector('[data-comments]');
 const list=panel.querySelector('ul');
 function showComment(text){const li=document.createElement('li');li.textContent=text;list.append(li)}
 comments().forEach(showComment);
 const toggle=dialog.querySelector('[data-comments-toggle]');
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('input').focus()};
 panel.querySelector('form').onsubmit=event=>{
  event.preventDefault();
  const input=event.currentTarget.elements.comment,text=input.value.trim();
  if(!text)return;
  const previous=data.storyComments;
  data.storyComments={...previous,[id]:[...comments(),text]};
  try{persist()}catch{data.storyComments=previous;toast('Could not save comment on this device.');return}
  showComment(text);input.value='';
 };
}
function mediaActions(item){const kind=item.type,items=kind==='story'?activeStories():data.posts.filter(x=>x.type==='reel');openDialog(`<h2>YOUR ${kind.toUpperCase()}</h2>${media(item)}<p class="vs-post-text">${esc(item.text)}</p>${tagLinks(item)}<div class="vs-actions"><button class="btn" data-vs="edit-item" data-kind="${kind}" data-id="${item.id}">Edit ${kind}</button><button class="btn-outline" data-vs="replace-item" data-kind="${kind}" data-id="${item.id}">Choose new ${item.arenaMode?'video':'photo or video'}</button><button class="btn-soft" data-vs="remove-item" data-kind="${kind}" data-id="${item.id}">Remove ${kind}</button></div><div class="vs-media-list">${items.length>1?items.map((x,i)=>`<button class="vs-media-edit" data-vs="media-menu" data-kind="${kind}" data-id="${x.id}" ${x.id===item.id?'aria-current="true"':''}>${esc(x.text||`${kind==='story'?'Story':'Reel'} ${i+1}`)}</button>`).join(''):''}</div><button class="btn-outline" data-vs="add-media" data-kind="${kind}">Add another ${kind}</button>`, 'Edit '+kind);hydrate()}
const cleanTags=tags=>[...new Set(Array.isArray(tags)?tags:[])].filter(id=>people.some(p=>p.id===id));
function tagLinks(item){const ids=cleanTags(item.tags);return ids.length?`<p class="vs-tags">With ${ids.map(id=>`<a href="#/repbook/member/${id}">@${esc(member(id).name)}</a>`).join(' ')}</p>`:''}
function tagPicker(item){const ids=cleanTags(item?.tags);return `<fieldset class="vs-tag-picker"><legend>Tag people</legend><p class="mini">Choose members to tag. These are sample members; tags stay on this browser and send no notifications.</p>${people.map(p=>`<label><input type="checkbox" name="taggedMember" value="${p.id}" ${ids.includes(p.id)?'checked':''}><span>${esc(p.name)}</span></label>`).join('')}</fieldset>`}

function media(x){if(!x.media)return '';return isVideoMedia(x)?`<video class="vs-media" data-media="${x.media}" controls playsinline preload="metadata" aria-label="Video by ${esc(member(x.author)?.name||s.name)}"></video>`:`<img class="vs-media" data-media="${x.media}" alt="${esc(x.text||'Member photo')}">`}
function post(x){let p=member(x.author)||member('me'),liked=data.likes.includes(x.id);return `<article class="card vs-post"><div class="vs-post-head"><a href="#/repbook/member/${p.id}" class="vs-person">${portrait(p.id)}<span><strong>${esc(p.name)}</strong><small>${x.at?new Date(x.at).toLocaleDateString('en-GB'):'Sample member · example post'}</small></span></a>${p.id==='me'?`<button class="btn-soft small" data-vs="delete" data-id="${x.id}">${icon('trash')}Delete</button>`:`<button class="btn-outline small" data-vs="follow" data-id="${p.id}" aria-pressed="${data.following.includes(p.id)}">${icon(data.following.includes(p.id)?'check':'plus')}${data.following.includes(p.id)?'Following':'Follow'}</button>`}</div>${x.activity||x.place?`<p class="rep-context">${[x.activity,x.place&&'At '+x.place].filter(Boolean).map(esc).join(' · ')}</p>`: ''}<p class="vs-post-text" data-colour="${postColours.includes(x.colour)?x.colour:'Default'}">${esc(x.text)}</p>${tagLinks(x)}${media(x)}<div class="vs-post-tools"><button class="rep-like" aria-label="Like post" data-vs="like" data-id="${x.id}" aria-pressed="${liked}">${icon('heart')}</button><span>${x.type==='reel'?'Reel':'Community post'}</span></div></article>`}
function side(){return `<aside class="vs-sidebar"><article class="card"><div class="eyebrow">MAKE IT YOURS</div><h3>Your place in the Repbook</h3><p>Add a picture and a little about yourself so your profile feels like you.</p><a href="#/profile" class="btn-outline">Edit my profile</a></article><article class="card"><div class="eyebrow">EFFORT COUNTS</div><h3>Progress at your pace</h3><p>Training, nutrition and accountability build your progress. Likes and followers do not earn points.</p><a href="#/accountability" class="btn-outline">My accountability</a></article><article class="card"><h3>Meet the community</h3>${people.map(p=>`<a class="vs-person vs-member-link" href="#/repbook/member/${p.id}">${portrait(p.id)}<span><strong>${p.name}</strong><small>${p.topic} · sample member</small></span></a>`).join('')}</article></aside>`}
window.ravnRepbookWrap=wrap;
function home(){const items=[...data.posts,...samples].filter(x=>tab!=='following'||data.following.includes(x.author));return wrap(`<div class="vs-layout repbook-feed"><div class="rep-main"><button class="card vs-composer" data-vs="create">${portrait('me')}<span>Share a win or start a conversation…</span>${icon('photo')}</button><div class="rep-quick" aria-label="Quick actions"><button class="rep-glass" data-vs="add-media" data-kind="reel">${icon('reels')}<span>Reel</span></button><a class="rep-glass" href="#/repbook/challenges">${icon('challenge')}<span>Arena</span></a><button class="rep-glass" data-vs="tag-post">${icon('tag')}<span>Tag people</span></button><a class="rep-glass" href="#/repbook/achievements">${icon('trophy')}<span>Awards</span></a></div>${storyStrip()}<div class="vs-filters" aria-label="Feed filter"><button data-vs="filter" data-tab="all" aria-pressed="${tab==='all'}">${icon('feed')} Community</button><button data-vs="filter" data-tab="following" aria-pressed="${tab==='following'}">${icon('people')} Following</button></div>${items.length?items.map(post).join(''):'<div class="card vs-empty"><h3>Your feed starts here</h3><a class="btn-outline" href="#/repbook/members">Find people to follow</a></div>'}</div><aside class="vs-sidebar rep-profile-side">${window.repbookMemberSummary?.()||''}<a class="rep-glass rep-rank" href="#/repbook/leaderboard">${icon('trophy')} Leaderboard</a></aside></div>`)}
function reels(){const items=data.posts.filter(x=>x.type==='reel');return wrap(`${storyStrip()}<div class="sectionhead"><div><h2>REELS</h2><p>Tap your reel circle above to add a photo or video, or edit an existing reel.</p></div></div><div class="vs-reels">${items.length?items.map(post).join(''):''}</div>`)}
function members(){return wrap(`<h2>FIND YOUR PEOPLE</h2><p>Try following these fictional members. Your follows stay on this device.</p><div class="grid cols3">${people.map(p=>`<article class="card">${portrait(p.id,'vs-large')}<h3>${p.name}</h3><p>${p.bio}</p><a href="#/repbook/member/${p.id}" class="btn-outline">View profile</a></article>`).join('')}</div>`)}
function profileView(id='me'){const own=id==='me',p=member(id);if(!p)return wrap('<h2>Member not found</h2><a href="#/repbook/members">Browse members</a>');const posts=own?data.posts:samples.filter(x=>x.author===id);return wrap(`${own?storyStrip():''}<div class="vs-profile-head card">${own?photoButton('vs-large'):portrait(id,'vs-large')}<div><div class="eyebrow">${own?'MY PROFILE':'SAMPLE MEMBER'}</div><h2>${esc(p.name)}</h2><p>${esc(p.bio||'A little about your journey belongs here.')}</p><div class="vs-counts"><span><strong>${posts.length}</strong> posts</span><span><strong>${own?0:Number(data.following.includes(id))}</strong> followers</span><span><strong>${own?data.following.length:0}</strong> following</span></div></div>${!own?`<button class="btn" data-vs="follow" data-id="${id}" aria-pressed="${data.following.includes(id)}">${data.following.includes(id)?'Following':'Follow'}</button>`:''}</div>${own?`<div class="vs-layout"><form id="vs-profile" class="card"><h3>MAKE YOURSELF AT HOME</h3>${activeStories().length?'<button type="button" class="btn-outline" data-vs="manage-stories">Manage stories</button>':''}<label class="field"><span>Display name</span><input name="displayName" maxlength="45" required minlength="2" value="${esc(s.name)}"></label><label class="field"><span>My Bio</span><textarea name="bio" maxlength="300" rows="3">${esc(data.bio)}</textarea></label><label class="field"><span>Profile visibility preference</span><select name="visibility"><option value="members" ${s.visibility==='members'?'selected':''}>Members</option><option value="private" ${s.visibility==='private'?'selected':''}>Private</option></select></label><label class="checkline"><input name="progress" type="checkbox" ${data.showProgress?'checked':''}>Show progress on member preview</label><label class="checkline"><input name="awards" type="checkbox" ${data.showAwards?'checked':''}>Show achievements on member preview</label><p class="mini">These are review preferences. No profile is published to other members.</p><div class="vs-actions"><button class="btn" type="submit">Save profile</button><button class="btn-outline" type="button" data-vs="preview-profile">Preview as member</button></div><p id="vs-save-status" role="status"></p></form><aside><article class="card profile-progress-card"><h3>YOUR ACHIEVEMENTS</h3><p>${s.points} points · Level ${level()}</p><p>Earn badges through the Five Steps. 10 badges = Bronze, 50 = Silver, 100 = Gold.</p><p class="mini">Platinum: lead the leaderboard for a month and earn 10 Gold trophies in each step.</p><a class="btn-outline" href="#/repbook/achievements">View badges & trophies</a>${profileAwardBanner(profileAwardCounts())}</article></aside></div>`:''}<h2 class="vs-posts-title">${own?'MY POSTS':'POSTS'}</h2>${posts.length?posts.map(post).join(''):'<div class="card"><p>Your posts and reels will appear here.</p><button class="btn-outline" data-vs="create">Create a post</button></div>'}`)}
const originalRender=render;
vault=home;feed=home;stories=()=>wrap(storyStrip());profile=()=>profileView();
render=function(){document.querySelector('#vs-dialog')?.remove();originalRender();const p=path();let custom=p==='/repbook/reels'?reels():p==='/repbook/members'?members():p.startsWith('/repbook/member/')?profileView(p.split('/')[3]):null;if(custom!==null)document.querySelector('main.page').innerHTML=`<div class="wrap page-return"><a class="btn-outline" href="#/repbook">Back to Repbook</a></div>${custom}`;hydrate()};
function openDialog(html,label){document.querySelector('#vs-dialog')?.remove();const d=document.createElement('dialog');d.id='vs-dialog';d.className='vs-dialog';d.setAttribute('aria-label',label);d.innerHTML=`<button class="vs-close" type="button" aria-label="Close" data-vs="close">×</button>${html}`;document.body.append(d);d.addEventListener('close',()=>{if(!document.querySelector('#vs-dialog')||document.querySelector('#vs-dialog')===d){pending=null;cropImage=null}d.remove()});d.showModal();return d}
const postColours=['Default','Plum','Slate','Midnight'];
function postTools(existing){
 const activity=existing?.activity||'',place=existing?.place||'';
 return `<div class="rep-post-options">
  <details><summary>${icon('activity')}Feeling / activity</summary><label>How are you feeling?<input name="activity" maxlength="60" placeholder="Focused after training" value="${esc(activity)}"></label></details>
  <details><summary>${icon('place')}Check in</summary><label>Place<input name="place" maxlength="80" placeholder="Enter a place" value="${esc(place)}"></label></details>
 </div>`;
}
function composer(kind='post', existing=null, arenaMode=null, startTagging=false) {
  uploadVersion++;
  uploadChecking=false;
  pending=null;
  const title=arenaMode?(arenaMode==='tag'?'Tag challenge':'Reel challenge'):(existing?'Edit ':'Create ')+kind;
  const prompt=arenaMode?'Set your challenge and describe the rules…':'Share a win or a training update…';
  const dialog=openDialog(`<form id="vs-create" data-arena-mode="${arenaMode||existing?.arenaMode||''}" data-edit-id="${existing?.id||''}">
    <header class="rep-editor-head"><h2>${title}</h2><button class="rep-glass" type="submit">${existing?'Save':'Post'}</button></header>
    <div class="rep-author">${portrait('me')}<div><strong>${esc(s.name)}</strong>
      <select aria-label="Post format" id="vs-kind" ${existing||arenaMode?'disabled':''}>
        ${['post','reel','story'].map(k=>`<option value="${k}" ${k===kind?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}
      </select></div></div>
    <textarea aria-label="Your update" id="vs-text" maxlength="800" placeholder="${prompt}">${esc(existing?.text||'')}</textarea>
    ${existing?.media?media(existing):''}<div id="vs-media-preview"></div>
    <p id="vs-error" role="alert"></p>
    <div class="rep-editor-tools" aria-label="Post actions">
      <label class="rep-attach">${icon('photo')}<span>Add photo or video</span>
        <input id="vs-upload" type="file" accept="${arenaMode||existing?.arenaMode?'video/mp4,video/webm,video/quicktime':'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime'}">
      </label>
      <button type="button" class="rep-tag-open" aria-controls="rep-tag-screen">${icon('tag')}<span>Tag people</span></button>
      ${postTools(existing)}<small>Saved on this device · Videos up to 60 seconds</small>
    </div>
    <section id="rep-tag-screen" hidden aria-label="Tag people">
      <header class="rep-editor-head"><h2>Tag people</h2><button type="button" class="rep-glass rep-tag-done">Done</button></header>
      ${tagPicker(existing)}
    </section></form>`,title);
  dialog.classList.add('rep-editor');
  const format=dialog.querySelector('#vs-kind');
  const options=dialog.querySelector('.rep-post-options');
  function syncPostTools(){
    options.hidden=format.value!=='post';
  }
  format.addEventListener('change',syncPostTools);
  syncPostTools();
  const screen=dialog.querySelector('#rep-tag-screen');
  const opener=dialog.querySelector('.rep-tag-open');
  const done=dialog.querySelector('.rep-tag-done');
  function showTags(open) {
    screen.hidden=!open;
    dialog.classList.toggle('rep-tagging',open);
    dialog.setAttribute('aria-label',open?'Tag people':dialog.querySelector('.rep-editor-head h2').textContent);
    const count=screen.querySelectorAll('input:checked').length;
    opener.querySelector('span').textContent=count?'Tag people ('+count+')':'Tag people';
    (open?done:opener).focus();
  }
  opener.onclick=()=>showTags(true);
  done.onclick=()=>showTags(false);
  dialog.addEventListener('cancel',event=>{
    if(!screen.hidden){event.preventDefault();showTags(false)}
  });
  if(startTagging || arenaMode==='tag')showTags(true);
  hydrate();
}
function editableItem(kind,id){return (kind==='story'?activeStories():data.posts).find(x=>x.id===id&&x.author==='me'&&x.type===kind)}
function saveEntry(kind,text,existing,file,mediaId,tags=existing?.tags||[],arenaMode=existing?.arenaMode||null,details={}){
 const target=kind==='story'?data.stories:data.posts;
 const index=existing?target.findIndex(x=>x.id===existing.id):-1;
 if(existing&&(index<0||(kind==='story'&&Date.now()-existing.at>=DAY)))throw Error('This update is no longer available.');
 const item={...(existing||{id:uid(),author:'me',at:Date.now()}),text,type:kind,...details,arenaMode,tags:cleanTags(tags),media:mediaId||existing?.media||null,mime:file?.type||existing?.mime||''};
 if(existing)target[index]=item;else target.unshift(item);
 try{persist()}catch(error){if(existing)target[index]=existing;else target.shift();throw error}
 return item;
}
function db(){return new Promise((resolve,reject)=>{let r=indexedDB.open('ravn-vault-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('media');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function mediaStore(method,key,value){const d=await db();return new Promise((resolve,reject)=>{let tx=d.transaction('media',method==='get'?'readonly':'readwrite'),st=tx.objectStore('media'),r=method==='put'?st.put(value,key):st[method](key);let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>{d.close();resolve(result)};tx.onerror=()=>{d.close();reject(tx.error)};tx.onabort=()=>{d.close();reject(tx.error)}})}
// Each tile displays ordinary images, even when the browser pauses inline video.
const previewFrames=new Map();
async function captureFrames(src){
 const video=document.createElement('video');
 video.muted=true;
 video.playsInline=true;
 video.preload='auto';
 const canvas=document.createElement('canvas');
 const frames=[];
 function waitFor(event,start){
  return new Promise((resolve,reject)=>{
   const finish=success=>{
    clearTimeout(timer);
    video.removeEventListener(event,done);
    video.removeEventListener('error',fail);
    success?resolve():reject(Error('Preview unavailable'));
   };
   const done=()=>finish(true),fail=()=>finish(false);
   const timer=setTimeout(fail,4000);
   video.addEventListener(event,done);
   video.addEventListener('error',fail);
   try{start()}catch{fail()}
  });
 }
 try{
  await waitFor('loadedmetadata',()=>{video.src=src;video.load()});
  if(!video.videoWidth||!Number.isFinite(video.duration)||video.duration<=0)return frames;
  const scale=Math.min(1,320/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  for(const fraction of [0.12,0.32,0.52,0.72,0.9]){
   await waitFor('seeked',()=>{video.currentTime=video.duration*fraction});
   canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   frames.push(canvas.toDataURL('image/jpeg',0.76));
  }
 }catch{}finally{video.removeAttribute('src');video.load()}
 return frames;
}
const tileFrames=new WeakMap();
setInterval(()=>{
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const tile of document.querySelectorAll('[data-story-preview]')){
  const state=tileFrames.get(tile);
  if(!state||state.frames.length<2)continue;
  state.index=(state.index+1)%state.frames.length;
  tile.src=state.frames[state.index];
 }
},900);
async function loadTile(el){
 const key=el.dataset.media;
 const status=el.parentElement?.querySelector('[data-preview-status]');
 try{
  if(!mediaUrls.has(key)){
   const blob=await mediaStore('get',key);
   if(!blob)throw Error('Upload unavailable on this device');
   if(!mediaUrls.has(key))mediaUrls.set(key,URL.createObjectURL(blob));
  }
  const src=mediaUrls.get(key);
  if(!el.hasAttribute('data-story-preview')){
   if(el.getAttribute('src')!==src)el.src=src;
   return;
  }
  if(tileFrames.has(el))return;
  if(!previewFrames.has(key))previewFrames.set(key,captureFrames(src));
  const frames=await previewFrames.get(key);
  if(!el.isConnected)return;
  if(!frames.length)throw Error('Tap to open video');
  el.src=frames[0];
  el.hidden=false;
  tileFrames.set(el,{frames,index:0});
  if(status)status.hidden=true;
 }catch(error){
  if(status)status.textContent=error.message==='Upload unavailable on this device'?error.message:'Tap to open video';
  else if(el.isConnected&&!el.nextElementSibling?.hasAttribute('data-media-error'))
   el.insertAdjacentHTML('afterend','<p class="mini" data-media-error>This upload is unavailable on this device.</p>');
 }
}
function hydrate(){document.querySelectorAll('[data-media]').forEach(loadTile)}
async function validateFile(file){if(!file)throw Error('Choose a photo or video.');if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(file.type))throw Error('Choose a JPG, PNG, WebP, MP4, MOV or WebM file.');const video=file.type.startsWith('video/');if(file.size>(video?20:10)*1024*1024)throw Error(video?'Choose a video smaller than 20 MB.':'Choose a photo smaller than 10 MB.');const url=URL.createObjectURL(file);try{await new Promise((resolve,reject)=>{let el=document.createElement(video?'video':'img');const timer=setTimeout(()=>{el.removeAttribute('src');reject(Error('This file could not be opened. Try another format.'))},10000);el[video?'onloadedmetadata':'onload']=()=>{clearTimeout(timer);video&&(!Number.isFinite(el.duration)||el.duration>60)?reject(Error('Choose a video no longer than 60 seconds.')):resolve()};el.onerror=()=>{clearTimeout(timer);reject(Error('This file cannot be played in this browser. Try MP4 or JPG.'))};el.src=url})}finally{URL.revokeObjectURL(url)}return file}
function showPhotoCrop(img){photoSource=null;openDialog(`<h2>CROP YOUR PICTURE</h2><canvas id="vs-canvas" width="512" height="512" aria-label="Profile picture crop preview"></canvas><label class="field"><span>Zoom</span><input id="vs-zoom" type="range" min="1" max="3" step="0.05" value="1"></label><label class="field"><span>Horizontal position</span><input id="vs-x" type="range" min="0" max="100" value="50"></label><label class="field"><span>Vertical position</span><input id="vs-y" type="range" min="0" max="100" value="50"></label><button class="btn" data-vs="save-crop">Use this picture</button>`,'Crop profile picture');cropImage=img;cropDraw()}
function cropDraw(){if(!cropImage)return;let c=document.getElementById('vs-canvas');if(!c)return;const z=Number(document.getElementById('vs-zoom').value),fx=Number(document.getElementById('vs-x').value)/100,fy=Number(document.getElementById('vs-y').value)/100;const side=Math.min(cropImage.width,cropImage.height)/z;c.getContext('2d').drawImage(cropImage,(cropImage.width-side)*fx,(cropImage.height-side)*fy,side,side,0,0,512,512)}
document.addEventListener('change',async e=>{if(e.target.id==='vs-kind'){const dialog=e.target.closest('dialog');const title='Create '+e.target.value;dialog.querySelector('h2').textContent=title;dialog.setAttribute('aria-label',title)}if(e.target.id==='vs-upload'){
const version=++uploadVersion;pending=null;uploadChecking=true;
const input=e.target,error=document.getElementById('vs-error'),preview=document.getElementById('vs-media-preview'),form=input.closest('form'),button=form.querySelector('[type=submit]');
preview.replaceChildren();error.textContent='Checking file…';button.disabled=true;
try{const file=await validateFile(input.files[0]);if(version!==uploadVersion||!input.isConnected)return;
pending=file;error.textContent=file.name;
const el=document.createElement(file.type.startsWith('video/')?'video':'img'),url=URL.createObjectURL(file);
el.src=url;el.className='vs-upload-preview';if(el.tagName==='VIDEO'){el.controls=true;el.playsInline=true}preview.append(el);
document.getElementById('vs-dialog').addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});
}catch(err){if(version===uploadVersion&&input.isConnected)error.textContent=err.message}
finally{if(version===uploadVersion){uploadChecking=false;if(button.isConnected)button.disabled=false}}
}if(e.target.id==='vs-photo'){const file=e.target.files[0];if(!file)return;try{if(!file.type.startsWith('image/'))throw Error('Choose a JPG, PNG or WebP photo.');await validateFile(file);const url=URL.createObjectURL(file),img=new Image();await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=url});URL.revokeObjectURL(url);showPhotoCrop(img);photoSource=file}catch(err){toast(err.message||'Could not open that picture.')}}});
document.addEventListener('input',e=>{if(['vs-zoom','vs-x','vs-y'].includes(e.target.id))cropDraw()});
document.addEventListener('submit',async e=>{if(e.target.id==='vs-profile'){e.preventDefault();const f=e.target;try{s.name=f.elements.displayName.value.trim();if(s.name.length<2)throw Error('Use a display name of at least two characters.');s.visibility=f.elements.visibility.value;s.joined=true;data.bio=f.elements.bio.value.trim();data.showProgress=f.elements.progress.checked;data.showAwards=f.elements.awards.checked;persist();save();render();toast('Profile saved on this browser')}catch(err){document.getElementById('vs-save-status').textContent=err.message}return}if(e.target.id!=='vs-create')return;e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]'),err=document.getElementById('vs-error');if(uploadChecking){err.textContent='Please wait while your file is checked.';return}b.disabled=true;const selectedFile=pending;let mediaId=null;try{const kind=document.getElementById('vs-kind').value,text=document.getElementById('vs-text').value.trim(),editId=f.dataset.editId,existing=editId?editableItem(kind,editId):null;if(editId&&!existing)throw Error('This update is no longer available.');if(document.getElementById('vs-upload').files.length&&!selectedFile)throw Error('Choose a supported file or clear the file selection before saving.');const details=kind==='post'?{activity:f.elements.activity.value.trim(),place:f.elements.place.value.trim()}:{};if(!text&&!details.activity&&!details.place&&!selectedFile&&!existing?.media)throw Error('Add an update or choose a file first.');if(kind==='reel'&&!selectedFile&&!existing?.media)throw Error('Choose a photo or video for your reel.');if(f.dataset.arenaMode&&!(selectedFile?selectedFile.type:(existing?.mime||'video/mp4')).startsWith('video/'))throw Error('Choose a video for your challenge.');if(selectedFile){mediaId=uid();await mediaStore('put',mediaId,selectedFile)}saveEntry(kind,text,existing,selectedFile,mediaId,Array.from(f.querySelectorAll('[name=taggedMember]:checked'),el=>el.value),f.dataset.arenaMode||null,details);if(mediaId&&existing?.media){await mediaStore('delete',existing.media).catch(()=>{});if(mediaUrls.has(existing.media)){URL.revokeObjectURL(mediaUrls.get(existing.media));mediaUrls.delete(existing.media)}}if(f.isConnected){f.closest('dialog')?.close();tab='all';render();if(kind==='reel')navto(f.dataset.arenaMode?'/repbook/challenges':'/repbook/reels')}toast(existing?'Changes saved on this browser':'Saved on this browser')}catch(ex){if(mediaId)await mediaStore('delete',mediaId).catch(()=>{});if(err.isConnected)err.textContent=ex.message||'Storage is full. Delete an upload and try again.'}finally{b.disabled=false}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-vs]');if(!b)return;const action=b.dataset.vs,id=b.dataset.id;try{if(action==='tag-post'){composer('post',null,null,true);return}if(action==='add-media'){composer(b.dataset.kind);return}if(action==='media-menu'||action==='replace-item'){const item=editableItem(b.dataset.kind,id);if(!item)return;if(action==='media-menu')mediaActions(item);else{composer(item.type,item);}return}if(action==='remove-item'){const item=editableItem(b.dataset.kind,id);if(!item||!confirm('Remove this '+item.type+'?'))return;const key=item.type==='story'?'stories':'posts',previous=data[key],likes=data.likes;data[key]=previous.filter(x=>x.id!==id);data.likes=likes.filter(x=>x!==id);try{persist()}catch(error){data[key]=previous;data.likes=likes;throw error}if(item.media){await mediaStore('delete',item.media).catch(()=>{});if(mediaUrls.has(item.media)){URL.revokeObjectURL(mediaUrls.get(item.media));mediaUrls.delete(item.media)}}document.getElementById('vs-dialog')?.close();render();toast('Removed from this browser');return}if(action==='manage-reels'){manageMedia('reel');return}if(action==='manage-stories'){manageMedia('story');return}if(action==='edit-item'){const item=editableItem(b.dataset.kind,id);if(item)composer(item.type,item);return}if(action==='edit-photo'){if(!data.photo){const input=document.getElementById('vs-photo');input.value='';input.click();return}openDialog(`<h2>YOUR PROFILE PICTURE</h2>${portrait('me','vs-large')}<div class="vs-actions" style="margin-top:24px"><button class="btn" data-vs="recrop-photo">Edit crop</button><button class="btn-outline" data-vs="choose-photo">Choose new picture</button><button class="btn-soft" data-vs="remove-photo">Remove picture</button></div>`,'Edit profile picture');return}if(action==='choose-photo'){document.getElementById('vs-dialog')?.close();const input=document.getElementById('vs-photo');input.value='';input.click();return}if(action==='recrop-photo'){
const original=await mediaStore('get',data.photoOriginalId||'profile-original').catch(()=>null),img=new Image(),url=original?URL.createObjectURL(original):data.photo;
try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});showPhotoCrop(img);photoSource=original}finally{if(original)URL.revokeObjectURL(url)}return}if(action==='close'){document.getElementById('vs-dialog')?.close();return}if(action==='create'){composer(b.dataset.kind);return}if(action==='filter'){tab=b.dataset.tab;render();return}if(action==='follow'){if(!people.some(p=>p.id===id))return;data.following=data.following.includes(id)?data.following.filter(x=>x!==id):[...data.following,id];persist();render();return}if(action==='like'){
 const previous=data.likes,liked=!previous.includes(id);
 data.likes=liked?[...previous,id]:previous.filter(x=>x!==id);
 try{persist()}catch(error){data.likes=previous;throw error}
 b.setAttribute('aria-pressed',String(liked));return
}if(action==='remove-photo'){const previous=data.photo;data.photo='';try{persist()}catch(err){data.photo=previous;throw err}await mediaStore('delete',data.photoOriginalId||'profile-original').catch(()=>{});render();return}if(action==='save-crop'){
b.disabled=true;const previous=data.photo,previousOriginal=data.photoOriginalId;let originalId=null;
try{const cropped=document.getElementById('vs-canvas').toDataURL('image/jpeg',0.88);
if(photoSource){originalId='profile-original-'+uid();await mediaStore('put',originalId,photoSource);data.photoOriginalId=originalId}
data.photo=cropped;try{persist()}catch(err){data.photo=previous;data.photoOriginalId=previousOriginal;if(originalId)await mediaStore('delete',originalId).catch(()=>{});throw err}
if(originalId)await mediaStore('delete',previousOriginal||'profile-original').catch(()=>{});
document.getElementById('vs-dialog')?.close();render();toast('Profile picture saved')
}finally{b.disabled=false}return}if(action==='delete'){const item=data.posts.find(x=>x.id===id);if(!item)return;if(!confirm('Delete this post from your review feed?'))return;data.posts=data.posts.filter(x=>x.id!==id);data.likes=data.likes.filter(x=>x!==id);persist();if(item.media){await mediaStore('delete',item.media);URL.revokeObjectURL(mediaUrls.get(item.media));mediaUrls.delete(item.media)}render();return}if(action==='story'||action==='friend-story'){
 const story=[...activeStories(),...visibleFriendStories()].find(item=>item.id===id);
 if(story)openStory(story);
 return
}if(action==='delete-story'){let x=data.stories.find(x=>x.id===id);data.stories=data.stories.filter(x=>x.id!==id);persist();if(x?.media)await mediaStore('delete',x.media);document.getElementById('vs-dialog')?.close();render();return}if(action==='preview-profile'){openDialog(s.visibility==='private'?'<h2>PRIVATE PROFILE</h2><p>Other members would not be able to view your profile.</p>':`${portrait('me','vs-large')}<h2>${esc(s.name)}</h2><p>${esc(data.bio)}</p>${data.showProgress?`<p>${s.points} points · Level ${level()}</p>`:''}${data.showAwards?profileAwardBanner(profileAwardCounts()):''}<p class="mini">Preview of your saved preferences; this is not a publicly shared profile.</p>`,'Member view preview');return}}catch(err){toast('Could not save. Browser storage may be full or unavailable.')}});
setInterval(()=>{if(['/repbook','/repbook/feed','/repbook/stories','/repbook/reels','/profile','/repbook/member/me'].includes(path())&&!document.querySelector('dialog[open]')){const strip=document.querySelector('[data-story-rows]');if(strip){strip.outerHTML=storyStrip();hydrate()}}},60000);
window.addEventListener('pagehide',event=>{if(event.persisted)return;for(const url of mediaUrls.values())URL.revokeObjectURL(url);mediaUrls.clear();previewFrames.clear()});
render();
})();
