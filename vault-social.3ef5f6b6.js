/* Review build: all social data stays on your browser. No shared accounts. */
(() => {
'use strict';
const editor=window.repMediaEditor;
let reactors=new Map();
let results=new Map(),likeCounts=new Map();
const DAY=86400000;
let people=[], allFollows=[], ownBadges=[], scores=[], replyTo=null, profilePath=null, feedVersion=0;
let data={bio:'',photo:'',following:[],likes:[],posts:[],stories:[],storyComments:{}};
const samples=[];
const activeStories=()=>data.stories.filter(x=>x.author==='me' && Date.now()-x.at<DAY);
const visibleFriendStories=()=>data.stories.filter(x=>data.following.includes(x.author)&&Date.now()-x.at<DAY);
let tab='all',mediaUrls=new Map(),pending=null,cropImage=null,photoSource=null,uploadVersion=0,uploadChecking=false;
const uid=()=>crypto.randomUUID();
window.loadCommunity=async()=>{
 const version=++feedVersion,me=community.identity(),live=await community.snapshot();
 if(version!==feedVersion||community.identity()!==me)return;
 people=live.profiles.filter(p=>p.id!==me).map(p=>({id:p.id,name:p.display_name,bio:p.bio,avatar:p.avatar_path}));
 const mine=live.profiles.find(p=>p.id===me);
 s.name=mine?.display_name||'Member';s.visibility=mine?.discoverable===false?'private':'members';
 profilePath=mine?.avatar_path;data.photo=profilePath?'present':'';data.bio=mine?.bio||'';
 const posts=live.posts.map(p=>({id:p.id,author:p.user_id===me?'me':p.user_id,text:p.body,
  type:p.kind,at:Date.parse(p.created_at),media:p.media_path,mime:p.media_type==='video'?'video/mp4':'image/jpeg',
  tags:p.tags||[],effects:editor.clean(p.effects),activity:p.activity,place:p.place,arenaMode:p.challenge,reply:p.reply_to}))
  .sort((a,b)=>b.at-a.at);
 data.posts=posts.filter(p=>p.type!=='story');data.stories=posts.filter(p=>p.type==='story');
 data.likes=live.likes.filter(l=>l.user_id===me).map(l=>l.post_id);
 results=new Map(live.results.map(row=>[row.challenge_id,row]));
 likeCounts=new Map();

 reactors=new Map();
 for(const like of live.likes){
  const ids=reactors.get(like.post_id)||[];
  ids.push(like.user_id===me?'me':like.user_id);
  reactors.set(like.post_id,ids);
  likeCounts.set(like.post_id,ids.length);
 }
 data.storyComments={};
 for(const c of live.comments)(data.storyComments[c.post_id]??=[]).push(c.body);
 allFollows=live.follows;data.following=allFollows.filter(f=>f.follower_id===me).map(f=>f.followed_id);
 scores=live.scores;ownBadges=live.own;
 const leading=live.months[0];verifiedMonth=leading?{verified:true,rank:1,month:leading.month,daysAtNumberOne:leading.days}:null;
};
const member=id=>id==='me'?{id,name:s.name,bio:data.bio}:people.find(p=>p.id===id)||{id,name:'Member',bio:''};
const portrait=(id,size='')=>{
 const photo=id==='me'?profilePath:member(id).avatar;
 return photo?`<img class="vs-avatar ${size}" data-media="${esc(photo)}" alt="Profile picture">`:`<span class="vs-avatar ${size}" aria-hidden="true">${esc(member(id).name.slice(0,1))}</span>`;
};
let verifiedMonth=null;
arenaTrophyData=()=>{
 const awards=[];
 for(const row of ownBadges){
  const step=trophySteps.find(([,name])=>name===row.step)?.[0];
  for(let i=0;i<row.badges;i++)awards.push({id:step+i,step});
 }
 return calculateTrophies(awards,verifiedMonth);
};
function repTotal(count){return count+' '+(count===1?'Rep':'Reps')}
function challengeStatus(item){
 const result=results.get(item.id);
 if(result){
  const winner=result.winner_id===community.identity()?s.name:member(result.winner_id).name;
  return `<p><strong>🥉 ${esc(winner)} won a bronze badge</strong> · ${result.winning_likes} ${result.winning_likes===1?'Rep':'Reps'} at close</p>`;
 }
 const close=item.author==='me'?`<button class="btn-outline" data-vs="close-challenge" data-id="${esc(item.id)}">Close challenge and award badge</button>`:'';
 return '<p>Give a Rep by tapping the dumbbell. The entry with the most Reps wins a bronze badge when the creator closes the challenge. A tie keeps the challenge open.</p>'+close;
}
achievements=()=>wrap('<div class="rep-trophy-page"><h2>Your badges &amp; trophies</h2>'+profileAwardBanner(profileAwardCounts())+arenaTrophyCollection()+checkinForm()+'</div>');
function checkinForm(){return `<form class="card" id="live-checkin"><h3>Record a daily step</h3><p>Every third consecutive day you visit while signed in gives you a 1 in 3 chance of a Determination badge. A missed day starts a new streak.</p><p>When paid memberships launch, a subscriber’s daily check-in will also have a 1 in 3 chance of a badge for that step.</p><label class="field">Step<select name="step">${trophySteps.map(([,name])=>'<option>'+name+'</option>').join('')}</select></label><label class="field">What did you do today?<textarea name="reflection" minlength="10" maxlength="500" required></textarea></label><button class="btn">Save check-in</button><p role="status"></p></form>`}
arenaLeaderboard=()=>{
 const totals=new Map();
 for(const row of scores)totals.set(row.user_id,(totals.get(row.user_id)||0)+row.month_badges);
 const entries=[...totals].filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
 return wrap('<h2>Monthly leaderboard</h2>'+ (entries.length?'<ol>'+entries.map(([id,n])=>'<li>'+esc(id===community.identity()?s.name:member(id).name)+' · '+n+' badges</li>').join('')+'</ol>':'<p>No badges earned yet this month.</p>')+checkinForm());
};
const photoButton=(size='')=>`<button type="button" class="vs-photo-button ${size}" data-vs="edit-profile" aria-label="Edit profile" title="Edit profile">${portrait('me',size)}<span class="vs-photo-edit" aria-hidden="true">+</span></button>`;
const glyphs={activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',place:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',feed:'<path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',reels:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m10 9 6 3-6 3Z M4 7h16 M8 3l3 4 M14 3l3 4"/>',challenge:'<path d="M2 9 6 5h12l4 4-4 4H6L2 9Z M2 9l2 8 4 3h8l4-3 2-8 M8 14l1 5 M16 14l-1 5 M7 9h10"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3 M16 5a3 3 0 0 1 0 6 M18 15a5 5 0 0 1 3 5"/>',profile:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',plus:'<path d="M12 4v16 M4 12h16"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',tag:'<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1"/>',trophy:'<path d="M8 3h8v7a4 4 0 0 1-8 0Z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v6 M7 21h10"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',trash:'<path d="M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7"/>',check:'<path d="m4 12 5 5L20 6"/>'};
const icon=name=>`<svg class="rep-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]||glyphs.plus}</svg>`;
const navBar=()=>`<nav class="vs-nav rep-dock" aria-label="Repbook">${[['/repbook','Feed','feed'],['/repbook/reels','Reels','reels'],['/repbook/challenges','Arena','challenge'],['/repbook/members','People','people'],['/profile','Profile','profile']].map(([url,label,glyph])=>`<a href="#${url}" ${path()===url||url==='/repbook'&&path()==='/repbook/feed'?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span></a>`).join('')}</nav>`;
const intro=()=>`<header class="vs-heading rep-header"><a href="#/" class="rep-brand" aria-label="RAVN South home"><img src="./assets/ravn-angular-logo.png" alt="RAVN South"></a><h1>${path()==='/repbook/challenges'?'ARENA':'REPBOOK'}</h1><div class="rep-header-actions"><a class="rep-glass" href="#/repbook/members" aria-label="Find people">${icon('search')}</a><button class="rep-glass" data-vs="create" aria-label="Create a post">${icon('plus')}</button></div></header>${navBar()}`;
const wrap=body=>`<section class="section repbook-section"><div class="wrap vs-shell">${intro()}<input id="vs-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose profile picture">${body}</div></section>`;
window.ravnArenaProfile = () => ({name:s.name,bio:data.bio,picture:photoButton('vs-large')});
window.ravnArenaUpload = kind => composer('reel', null, kind);

function isVideoMedia(item){
 return item.mime ? item.mime.startsWith('video/') : item.type==='reel';
}
function previewTile(item,label) {
 const attrs=`class="rep-story-cover" data-media="${esc(item.media)}" aria-hidden="true"`;
 const video=isVideoMedia(item);
 const cover=!item.media?'':video && item.type==='reel'
  ? `<video ${attrs} data-reel-preview muted playsinline loop preload="metadata"></video>`
  :video
  ? `<img ${attrs} alt="" data-story-preview="${item.type}" hidden><small data-preview-status>Loading preview…</small>`
  : `<img ${attrs} alt="">`;
 return `<button type="button" class="vs-story rep-own-story rep-media-stage" data-effect-filter="${editor.clean(item.effects).filter}" data-vs="${item.type==='story'?'story':'view-reel'}" data-kind="${item.type}" data-id="${esc(item.id)}" aria-label="Open ${esc(label)}">
  ${cover}${editor.overlay(item.effects)}<strong>${esc(label)}</strong>${item.media?'':`<small>${esc(item.text)}</small>`}</button>`;
}
function authorGroups(items){
 const groups=new Map();
 for(const item of items){
  if(!groups.has(item.author))groups.set(item.author,[]);
  groups.get(item.author).push(item);
 }
 return [...groups.values()].map(group=>group.sort((a,b)=>a.at-b.at));
}
function stackTiles(items,ownLabel){
 return authorGroups(items).map(group=>{
  const first=group[0],label=first.author==='me'?ownLabel:member(first.author).name;
  return previewTile(first,label+(group.length>1?' · '+group.length:''));
 }).join('');
}
function reelCircle(){
 const reels=data.posts.filter(x=>x.type==='reel' && !x.arenaMode);
 if(reels.length)return stackTiles(reels,'Your reel');
 return `<button type="button" class="vs-story" data-vs="add-media" data-kind="reel" aria-label="Add a reel"><span class="vs-story-ring vs-reel-ring" aria-hidden="true">${icon('reels')}</span><strong>Your reels</strong><small>Tap to add</small></button>`;
}
window.ravnChallengePreviews=mode=>{
 const items=data.posts.filter(x=>x.type==='reel' && x.arenaMode===mode&&!x.reply);
 if(!items.length)return '';
 const label=mode==='tag'?'Tag challenge':'Reel challenge';
 return `<div class="vs-stories rep-challenge-previews" aria-label="${label} videos">${items.map(x=>previewTile(x,label)).join('')}</div>`;
};
function storyStrip(){const own=activeStories(),friends=visibleFriendStories();return `<div data-story-rows><section class="vs-stories" aria-label="Posts and reels"><button type="button" class="vs-story" data-vs="create" aria-label="Create a post"><span class="vs-story-ring">${icon('plus')}</span><strong>Post</strong></button>${reelCircle()}</section><section class="vs-stories" aria-label="Stories">${stackTiles(own,'Your story')}<button type="button" class="vs-story" data-vs="add-media" data-kind="story" aria-label="Add your story"><span class="vs-story-ring">${icon('plus')}</span><strong>${own.length?'Add story':'Your story'}</strong><small>Tap to add</small></button>${stackTiles(friends,'Your story')}<p>${friends.length?'Stories from people you follow.':'Friends’ stories appear here when you follow them.'}<br><small>Stories last 24 hours. </small></p></section></div>`}
function manageMedia(kind){const items=kind==='story'?activeStories():data.posts.filter(x=>x.type==='reel'&&x.author==='me');if(!items.length){composer(kind);return}mediaActions(items[0])}
function openMediaViewer(item, showComments=false){
 const {id,type}=item;
 const comments=()=>data.storyComments?.[id]||[];
 const dialog=openDialog(`${media(item)||`<p>${esc(item.text||'')}</p>`}
  <p class="vs-post-text">${mentionText(item.text)}</p>${tagLinks(item)}
  ${item.arenaMode&&!item.reply?challengeStatus(item):''}
  ${item.arenaMode&&!item.reply&&!results.has(id)&&(item.arenaMode!=='tag'||item.tags.includes(community.identity()))?'<button class="btn" data-vs="respond" data-id="'+esc(id)+'">Enter challenge</button>':''}
  ${item.arenaMode&&!item.reply?data.posts.filter(x=>x.reply===id).map(x=>previewTile(x,'Entry by '+member(x.author).name+' · '+repTotal(likeCounts.get(x.id)||0))).join(''):''}
  <div class="vs-post-tools story-tools">
   <button type="button" class="rep-react" data-vs="like" data-id="${esc(id)}" aria-label="Rep this ${esc(type)}" aria-pressed="${data.likes.includes(id)}">${repDumbbell()}${postRepCount(id)}</button>
   <button type="button" class="btn-soft" data-comments-toggle aria-expanded="false">Comment</button>
  </div>
  <div data-comments hidden><ul aria-label="${type} comments"></ul>
   <form><label>Comment<input name="comment" required maxlength="500" autocomplete="off"></label><button class="btn-soft">Post comment</button></form>
  </div>`,'View '+type);
 dialog.classList.add('story-player');
 dialog.classList.add('reel-player');
 const video=dialog.querySelector('video');
 if(video){video.muted=type!=='reel';video.autoplay=true;video.loop=false}
 hydrate();
 const panel=dialog.querySelector('[data-comments]');
 const list=panel.querySelector('ul');
 function showComment(text){const li=document.createElement('li');li.textContent=text;list.append(li)}
 comments().forEach(showComment);
 const toggle=dialog.querySelector('[data-comments-toggle]');
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('input').focus()};
 installPlayback(dialog,item,video,panel);
 if(showComments)toggle.click();
 panel.querySelector('form').onsubmit=async event=>{
  event.preventDefault();
  const input=event.currentTarget.elements.comment,text=input.value.trim();
  if(!text)return;
  const send=event.currentTarget.querySelector('button');if(send.disabled)return;send.disabled=true;
  try{await community.comment(id,text);(data.storyComments[id]??=[]).push(text)}
  catch(e){toast(e.message);return}finally{send.disabled=false}
  showComment(text);input.value='';
 };
}
function updateFaces(dialog,id){
 const lane=dialog?.querySelector('.rep-faces');
 if(!lane||lane.dataset.id!==id)return;
 const ids=reactors.get(id)||[];
 let index=0;
 function next(){
  lane.replaceChildren();
  if(!ids.length)return;
  const person=ids[index++ % ids.length],link=document.createElement('a');
  link.href=person==='me'?'#/profile':'#/repbook/member/'+encodeURIComponent(person);
  link.setAttribute('aria-label','View '+member(person).name+'’s profile');
  link.innerHTML=portrait(person);
  link.onclick=()=>dialog.close();
  lane.append(link);
  link.querySelectorAll('[data-media]').forEach(loadTile);
 }
 lane.onanimationend=next;
 next();
}
let viewerMuted=null;
function installPlayback(dialog,item,video,panel){
 const stories=[...activeStories(),...visibleFriendStories()];
 const items=item.type==='story'?stories:data.posts.filter(x=>x.type==='reel'&&x.arenaMode===item.arenaMode);
 const groups=authorGroups(items.some(x=>x.id===item.id)?items:[item]);
 const queue=groups.flat(),index=queue.findIndex(x=>x.id===item.id);
 const group=groups.find(g=>g.some(x=>x.id===item.id));
 const position=group.findIndex(x=>x.id===item.id);
 const timeline=document.createElement('div');
 timeline.className='rep-timeline';
 timeline.setAttribute('aria-label','Item '+(position+1)+' of '+group.length);
 timeline.innerHTML=group.map((_,i)=>'<progress max="1" value="'+Number(i<position)+'"></progress>').join('');
 dialog.prepend(timeline);
 const lane=document.createElement('div');
 lane.className='rep-faces';lane.dataset.id=item.id;
 (dialog.querySelector('.rep-media-stage')||dialog).append(lane);
 updateFaces(dialog,item.id);
 dialog.querySelector('.vs-close').remove();
 if(video){
  video.controls=false;
  video.muted=viewerMuted??video.muted;
  const stage=video.parentElement;
  const mute=document.createElement('button');
  mute.type='button';
  mute.className='rep-volume';
  const speaker='<path d="M3 9h4l5-4v14l-5-4H3z"/>';
  function syncVolume(){
   const label=video.muted?'Unmute video':'Mute video';
   mute.setAttribute('aria-label',label);
   mute.title=label;
   const sound=video.muted?'<path d="m16 9 6 6m0-6-6 6"/>':'<path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>';
   mute.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'+speaker+sound+'</svg>';
  }
  mute.onclick=()=>{
   viewerMuted=video.muted=!video.muted;
   syncVolume();
   if(video.paused)video.play().catch(()=>{});
  };
  video.onvolumechange=syncVolume;
  video.onclick=()=>video.paused?video.play().catch(()=>{}):video.pause();
  video.onloadedmetadata=()=>{
   video.play().catch(error=>{
    if(error.name==='NotAllowedError'&&!video.muted&&dialog.isConnected){
     video.muted=true;syncVolume();video.play().catch(()=>{});
    }
   });
  };
  stage.append(mute);syncVolume();
  dialog.classList.add('rep-video-screen');
  const details=document.createElement('div');
  details.className='rep-viewer-details';
  for(const child of [...dialog.children]){
   if(child!==stage&&child!==timeline)details.append(child);
  }
  dialog.append(details);
  if(matchMedia("(max-width:900px), (max-height:550px) and (pointer:coarse)").matches)dialog.append(mute);
 }
 function move(step){
  if(queue.length===1){if(video){video.currentTime=0;video.play().catch(()=>{})}return}
  openMediaViewer(queue[(index+step+queue.length)%queue.length]);
 }
 dialog.onkeydown=e=>{
  if(e.target.matches('input,textarea,select'))return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowRight'?1:-1)}
  if(e.key==='ArrowUp'){e.preventDefault();dialog.close()}
 };
 let start=null;
 dialog.addEventListener('touchstart',e=>{
  start=e.touches.length===1&&!e.target.closest('[data-comments],input,textarea')?e.touches[0]:null;
 },{passive:true});
 dialog.addEventListener('touchcancel',()=>{start=null});
 dialog.addEventListener('touchend',e=>{
  if(!start)return;
  const dx=e.changedTouches[0].clientX-start.clientX,dy=e.changedTouches[0].clientY-start.clientY;
  start=null;
  if(Math.abs(dx)>50&&Math.abs(dx)>1.3*Math.abs(dy))move(dx<0?1:-1);
  else if(dy< -55&&-dy>1.3*Math.abs(dx))dialog.close();
 },{passive:true});
 let elapsed=0,last=performance.now();
 const bar=timeline.children[position];
 function tick(now){
  if(!dialog.isConnected||!dialog.open)return;
  if(!document.hidden&&panel.hidden){
   elapsed+=Math.min(now-last,200);
   bar.value=video?(video.duration?video.currentTime/video.duration:0):elapsed/6000;
   if(video?video.ended:elapsed>=6000){elapsed=0;move(1)}
  }
  last=now;requestAnimationFrame(tick);
 }
 requestAnimationFrame(tick);
}
function mediaActions(item){const kind=item.type,items=kind==='story'?activeStories():data.posts.filter(x=>x.type==='reel'&&x.author==='me');openDialog(`<h2>YOUR ${kind.toUpperCase()}</h2>${media(item)}<p class="vs-post-text">${esc(item.text)}</p>${tagLinks(item)}<div class="vs-actions"><button class="btn" data-vs="edit-item" data-kind="${kind}" data-id="${item.id}">Edit ${kind}</button><button class="btn-outline" data-vs="replace-item" data-kind="${kind}" data-id="${item.id}">Choose new ${item.arenaMode?'video':'photo or video'}</button><button class="btn-soft" data-vs="remove-item" data-kind="${kind}" data-id="${item.id}">Remove ${kind}</button></div><div class="vs-media-list">${items.length>1?items.map((x,i)=>`<button class="vs-media-edit" data-vs="media-menu" data-kind="${kind}" data-id="${x.id}" ${x.id===item.id?'aria-current="true"':''}>${esc(x.text||`${kind==='story'?'Story':'Reel'} ${i+1}`)}</button>`).join(''):''}</div><button class="btn-outline" data-vs="add-media" data-kind="${kind}">Add another ${kind}</button>`, 'Edit '+kind);hydrate()}
const cleanTags=tags=>[...new Set(Array.isArray(tags)?tags:[])].filter(id=>people.some(p=>p.id===id));
function mentionedIds(text){return cleanTags(Array.from(String(text||'').matchAll(/(?:^|[^a-z0-9_])@([a-z0-9_]+)\b/gi),match=>match[1].toLowerCase()))}
function mentionText(text){return esc(text||'').replace(/(^|[^a-z0-9_])@([a-z0-9_]+)\b/gi,(match,prefix,id)=>people.some(p=>p.id===id.toLowerCase())?`${prefix}<a class="rep-mention-link" href="#/repbook/member/${id.toLowerCase()}">@${id}</a>`:match)}
function bindMentions(dialog){
 const input=dialog.querySelector('#vs-text'),suggestions=dialog.querySelector('.rep-mention-suggestions');
 function suggest(){
  const before=input.value.slice(0,input.selectionStart),match=before.match(/(?:^|\s)@([a-z0-9_]*)$/i);
  suggestions.replaceChildren();suggestions.hidden=true;
  if(!match)return;
  const matches=people.filter(p=>p.id.startsWith(match[1].toLowerCase())||p.name.toLowerCase().startsWith(match[1].toLowerCase()));
  suggestions.hidden=!matches.length;
  matches.forEach(person=>{const button=document.createElement('button');button.type='button';button.textContent='@'+person.id+' · '+person.name;button.onclick=()=>{const end=input.selectionStart,start=end-match[1].length-1;const next=input.value.slice(0,start)+'@'+person.id+' '+input.value.slice(end);if(next.length>input.maxLength)return;input.value=next;const caret=start+person.id.length+2;input.focus();input.setSelectionRange(caret,caret);suggestions.hidden=true};suggestions.append(button)});
 }
 input.addEventListener('input',suggest);input.addEventListener('click',suggest);
 dialog.querySelector('[data-mention-search]').addEventListener('input',event=>{const query=event.target.value.toLowerCase().replace(/^@/,'').trim();let count=0;dialog.querySelectorAll('[data-member-option]').forEach(label=>{const person=member(label.dataset.memberOption);label.hidden=!(person.name.toLowerCase().includes(query)||person.id.includes(query));if(!label.hidden)count++});dialog.querySelector('[data-no-mentions]').hidden=count>0});
 dialog.addEventListener('click',event=>{if(event.target.closest('a[href^="#/repbook/member/"]'))dialog.close()});
}
function tagLinks(item){const ids=cleanTags(item.tags);return ids.length?`<p class="vs-tags">With ${ids.map(id=>`<a href="#/repbook/member/${id}">@${esc(member(id).name)}</a>`).join(' ')}</p>`:''}
function tagPicker(item){const ids=cleanTags(item?.tags);return `<fieldset class="vs-tag-picker"><legend>Tag people</legend><label class="rep-mention-search">Search members<input type="search" data-mention-search placeholder="Name or @username" autocomplete="off"></label><p data-no-mentions hidden>No matching members.</p><p class="mini">Choose members to tag. </p>${people.map(p=>`<label data-member-option="${p.id}"><input type="checkbox" name="taggedMember" value="${p.id}" ${ids.includes(p.id)?'checked':''}><span>${esc(p.name)}</span></label>`).join('')}</fieldset>`}

function media(x){if(!x.media)return '';return editor.wrap(isVideoMedia(x)?`<video class="vs-media" data-media="${esc(x.media)}" controls playsinline preload="metadata" aria-label="Video by ${esc(member(x.author)?.name||s.name)}"></video>`:`<img class="vs-media" data-media="${esc(x.media)}" alt="${esc(x.text||'Member photo')}">`,x.effects)}
function postRepCount(id){return '<span data-rep-count aria-live="polite">'+repTotal(likeCounts.get(id)||0)+'</span>'}
function post(x){let p=member(x.author)||member('me'),liked=data.likes.includes(x.id);return `<article class="card vs-post"><div class="vs-post-head"><a href="#/repbook/member/${p.id}" class="vs-person">${portrait(p.id)}<span><strong>${esc(p.name)}</strong><small>${x.at?new Date(x.at).toLocaleDateString('en-GB'):'Sample member · example post'}</small></span></a>${p.id==='me'?`<button class="btn-soft small" data-vs="delete" data-id="${x.id}">${icon('trash')}Delete</button>`:`<button class="btn-outline small" data-vs="follow" data-id="${p.id}" aria-pressed="${data.following.includes(p.id)}">${icon(data.following.includes(p.id)?'check':'plus')}${data.following.includes(p.id)?'Following':'Follow'}</button>`}</div>${x.activity||x.place?`<p class="rep-context">${[x.activity,x.place&&'At '+x.place].filter(Boolean).map(esc).join(' · ')}</p>`: ''}<p class="vs-post-text" data-colour="${postColours.includes(x.colour)?x.colour:'Default'}">${mentionText(x.text)}</p>${tagLinks(x)}${media(x)}<div class="vs-post-tools"><button class="rep-react" aria-label="Rep this post" data-vs="like" data-id="${x.id}" aria-pressed="${liked}">${repDumbbell()}${postRepCount(x.id)}</button><button type="button" class="btn-soft" data-vs="comment-reel" data-id="${esc(x.id)}">Comment</button></div></article>`}
function side(){return `<aside class="vs-sidebar"><article class="card"><div class="eyebrow">MAKE IT YOURS</div><h3>Your place in the Repbook</h3><p>Add a picture and a little about yourself so your profile feels like you.</p><a href="#/profile" class="btn-outline">Edit my profile</a></article><article class="card"><div class="eyebrow">EFFORT COUNTS</div><h3>Progress at your pace</h3><p>Training, nutrition and accountability build your progress. Reps and followers do not earn points.</p><a href="#/accountability" class="btn-outline">My accountability</a></article><article class="card"><h3>Meet the community</h3>${people.map(p=>`<a class="vs-person vs-member-link" href="#/repbook/member/${p.id}">${portrait(p.id)}<span><strong>${esc(p.name)}</strong><small>Member</small></span></a>`).join('')}</article></aside>`}
window.ravnRepbookWrap=wrap;
function home(){const items=[...data.posts,...samples].filter(x=>tab!=='following'||data.following.includes(x.author));return wrap(`<div class="vs-layout repbook-feed"><div class="rep-main"><button class="card vs-composer" data-vs="create">${portrait('me')}<span>Share a win or start a conversation…</span>${icon('photo')}</button><div class="rep-quick" aria-label="Quick actions"><button class="rep-glass" data-vs="add-media" data-kind="reel">${icon('reels')}<span>Reel</span></button><a class="rep-glass" href="#/repbook/challenges">${icon('challenge')}<span>Arena</span></a><button class="rep-glass" data-vs="tag-post">${icon('tag')}<span>@ Mention / tag people</span></button><a class="rep-glass" href="#/repbook/achievements">${icon('trophy')}<span>Awards</span></a></div>${storyStrip()}<div class="vs-filters" aria-label="Feed filter"><button data-vs="filter" data-tab="all" aria-pressed="${tab==='all'}">${icon('feed')} Community</button><button data-vs="filter" data-tab="following" aria-pressed="${tab==='following'}">${icon('people')} Following</button></div>${items.length?items.map(post).join(''):'<div class="card vs-empty"><h3>Your feed starts here</h3><a class="btn-outline" href="#/repbook/members">Find people to follow</a></div>'}</div><aside class="vs-sidebar rep-profile-side">${window.repbookMemberSummary?.()||''}<a class="rep-glass rep-rank" href="#/repbook/leaderboard">${icon('trophy')} Leaderboard</a></aside></div>`)}
function reels(){const items=data.posts.filter(x=>x.type==='reel');return wrap(`${storyStrip()}<div class="sectionhead"><div><h2>REELS</h2></div></div><div class="vs-reels">${items.length?items.map(post).join(''):''}</div>`)}
function members(){return wrap(`<h2>FIND YOUR PEOPLE</h2><p>Follow other ravnsouth members.</p><div class="grid cols3">${people.map(p=>`<article class="card">${portrait(p.id,'vs-large')}<h3>${esc(p.name)}</h3><p>${esc(p.bio)}</p><a href="#/repbook/member/${p.id}" class="btn-outline">View profile</a></article>`).join('')}</div>`)}
function editProfile(){const posts=data.posts.filter(item=>item.author==='me');openDialog(`<form id="vs-profile" class="card"><h3>Edit profile</h3><button type="button" class="btn-outline" data-vs="choose-photo">Change profile picture</button>${posts.some(item=>item.type==='reel')?'<button type="button" class="btn-outline" data-vs="manage-reels">Manage reels</button>':''}${activeStories().length?'<button type="button" class="btn-outline" data-vs="manage-stories">Manage stories</button>':''}<label class="field"><span>Display name</span><input name="displayName" maxlength="45" required minlength="2" value="${esc(s.name)}"></label><label class="field"><span>My Bio</span><textarea name="bio" maxlength="300" rows="3">${esc(data.bio)}</textarea></label><label class="field"><span>Profile visibility preference</span><select name="visibility"><option value="members" ${s.visibility==='members'?'selected':''}>Members</option><option value="private" ${s.visibility==='private'?'selected':''}>Private</option></select></label><p class="mini">A private profile hides your name and bio from the member directory.</p><div class="vs-actions"><button class="btn" type="submit">Save changes</button><button class="btn-outline" type="button" data-logout>Log out</button>${profilePath?'<button class="btn-soft" type="button" data-vs="remove-photo">Remove photo</button>':''}</div><button type="button" class="btn-outline" data-vs="delete-account">Delete account</button><p id="vs-save-status" role="status"></p></form>`,"Edit profile")}
function ownerPanel(){
 const stats=community.ownerOverview();
 if(!stats)return '';
 return `<section class="card"><h3>Owner dashboard</h3><p>${Number(stats.members)} registered accounts</p><p>Last 7 days · ${Number(stats.posters7d)} members posted · ${Number(stats.posts7d)} posts, reels and stories</p></section>`;
}
function profileView(id='me'){const own=id==='me',p=member(id);if(!own&&!people.some(x=>x.id===id))return wrap('<h2>Member not found</h2><a href="#/repbook/members">Browse members</a>');const posts=data.posts.filter(x=>x.author===id);return wrap(`${own?ownerPanel()+storyStrip():''}<div class="vs-profile-head card">${own?photoButton('vs-large'):portrait(id,'vs-large')}<div><div class="eyebrow">${own?'MY PROFILE':'MEMBER'}</div><h2>${esc(p.name)}</h2><p>${esc(p.bio||'A little about your journey belongs here.')}</p><div class="vs-counts"><span><strong>${posts.length}</strong> posts</span><span><strong>${allFollows.filter(f=>f.followed_id===(own?community.identity():id)).length}</strong> followers</span><span><strong>${allFollows.filter(f=>f.follower_id===(own?community.identity():id)).length}</strong> following</span></div></div>${!own?`<button class="btn" data-vs="follow" data-id="${id}" aria-pressed="${data.following.includes(id)}">${data.following.includes(id)?'Following':'Follow'}</button>`:''}</div>${own?`<div class="vs-layout"><button class="btn-outline" type="button" data-logout>Log out</button><aside><article class="card profile-progress-card"><h3>YOUR ACHIEVEMENTS</h3><p>${s.points} points · Level ${level()}</p><p>Earn badges through the Five Steps. 10 badges = Bronze, 50 = Silver, 100 = Gold.</p><p class="mini">Platinum: lead the leaderboard for a month and earn 10 Gold trophies in each step.</p><a class="btn-outline" href="#/repbook/achievements">View badges & trophies</a>${profileAwardBanner(profileAwardCounts())}</article></aside></div>`:''}<h2 class="vs-posts-title">${own?'MY POSTS':'POSTS'}</h2>${posts.length?posts.map(post).join(''):'<div class="card"><p>Your posts and reels will appear here.</p><button class="btn-outline" data-vs="create">Create a post</button></div>'}`)}
const originalRender=render;
vault=home;feed=home;stories=()=>wrap(storyStrip());profile=()=>profileView();
render=function(){document.querySelector('#vs-dialog')?.remove();originalRender();const p=path();let custom=p==='/repbook/reels'?reels():p==='/repbook/members'?members():p.startsWith('/repbook/member/')?profileView(p.split('/')[3]):null;if(custom!==null)document.querySelector('main.page').innerHTML=`<div class="wrap page-return"><a class="btn-outline" href="#/repbook">Back to Repbook</a></div>${custom}`;hydrate()};
function openDialog(html,label){document.querySelector('#vs-dialog')?.remove();const d=document.createElement('dialog');d.id='vs-dialog';d.className='vs-dialog';d.setAttribute('aria-label',label);d.innerHTML=`<button class="vs-close" type="button" aria-label="Close" data-vs="close">×</button>${html}`;document.body.append(d);d.addEventListener('close',()=>{if(!document.querySelector('#vs-dialog')||document.querySelector('#vs-dialog')===d){pending=null;cropImage=null}d.remove()});d.addEventListener('click',event=>{if(event.target.closest('a[href^="#/repbook/member/"]'))d.close()});d.showModal();return d}
const postColours=['Default','Plum','Slate','Midnight'];
function postTools(existing){
 const activity=existing?.activity||'',place=existing?.place||'';
 return `<div class="rep-post-options">
  <details><summary>${icon('activity')}Feeling / activity</summary><label>How are you feeling?<input name="activity" maxlength="60" placeholder="Focused after training" value="${esc(activity)}"></label></details>
  <details><summary>${icon('place')}Check in</summary><label>Place<input name="place" maxlength="80" placeholder="Enter a place" value="${esc(place)}"></label></details>
 </div>`;
}
function composer(kind='post', existing=null, arenaMode=null, startTagging=false) {
  replyTo=null;uploadVersion++;
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
    <div id="vs-media-preview">${existing?.media?media(existing):''}</div>
    <div class="rep-mention-suggestions" aria-label="Mention suggestions" hidden></div>
    <p id="vs-error" role="alert"></p>
    <div class="rep-editor-tools" aria-label="Post actions">
      <label class="rep-attach">${icon('photo')}<span>Add photo or video</span>
        <input id="vs-upload" type="file" accept="${arenaMode||existing?.arenaMode?'video/mp4,video/webm,video/quicktime':'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime'}">
      </label>
      <button type="button" class="rep-tag-open" aria-controls="rep-tag-screen">${icon('tag')}<span>@ Mention / tag people</span></button>
      ${editor.controls(existing?.effects)}${postTools(existing)}<small data-upload-limits></small>
    </div>
    <section id="rep-tag-screen" hidden aria-label="Tag people">
      <header class="rep-editor-head"><h2>Tag people</h2><button type="button" class="rep-glass rep-tag-done">Done</button></header>
      ${tagPicker(existing)}
    </section></form>`,title);
  dialog.classList.add('rep-editor');
  editor.bind(dialog.querySelector('form'));
  bindMentions(dialog);
  const format=dialog.querySelector('#vs-kind');
  const options=dialog.querySelector('.rep-post-options');
  function syncPostTools(){
    options.hidden=format.value!=='post';
    const limits=mediaLimits(format.value);
    dialog.querySelector('[data-upload-limits]').textContent=`Photos up to 20 MB · Videos up to ${limits.videoMB} MB / ${limits.seconds===60?'60 seconds':'3 minutes'}`;
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
    opener.querySelector('span').textContent=count?'@ Mentions / tags ('+count+')':'@ Mention / tag people';
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
// Each tile displays ordinary images, even when the browser pauses inline video.
const previewFrames=new Map();
async function captureFrames(src){
 const video=document.createElement('video');video.crossOrigin='anonymous';
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
  for(const fraction of [.12,.32,.52,.72,.9]){
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
  const cached=mediaUrls.get(key);
  if(!cached||cached.until<Date.now()){mediaUrls.set(key,{url:await community.signed(key),until:Date.now()+3300000})}
  const src=mediaUrls.get(key).url;
  if(el.hasAttribute('data-reel-preview')){
   if(!el.isConnected || el.dataset.previewSource===src)return;
   el.dataset.previewSource=src;
   el.muted=true;
   el.autoplay=!matchMedia('(prefers-reduced-motion: reduce)').matches;
   el.ontimeupdate=()=>{if(el.currentTime>=3&&!el.seeking)el.currentTime=0};
   el.src=src;
   return;
  }
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
function mediaLimits(kind='post') {
 return kind==='story'?{videoMB:25,seconds:60}:{videoMB:25,seconds:180};
}
async function validateFile(file,kind='post') {
 if(!file)throw Error('Choose a photo or video.');
 if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(file.type))throw Error('Choose a JPG, PNG, WebP, MP4, MOV or WebM file.');
 const video=file.type.startsWith('video/'),limits=mediaLimits(kind),maxMB=video?limits.videoMB:20;
 if(file.size>maxMB*1024*1024)throw Error(`Choose a ${video?'video':'photo'} no larger than ${maxMB} MB.`);
 const url=URL.createObjectURL(file);
 let el;
 try {
  await new Promise((resolve,reject)=>{
   el=document.createElement(video?'video':'img');
   if(video)el.preload='metadata';
   const timer=setTimeout(()=>reject(Error('This file could not be opened. Try another format.')),15000);
   el[video?'onloadedmetadata':'onload']=()=>{
    clearTimeout(timer);
    if(video&&(!Number.isFinite(el.duration)||el.duration<=0))reject(Error('This video has no readable duration. Try another file.'));
    else if(video&&el.duration>limits.seconds)reject(Error(`Choose a video no longer than ${limits.seconds===60?'60 seconds':'3 minutes'}.`));
    else resolve();
   };
   el.onerror=()=>{clearTimeout(timer);reject(Error('This file cannot be played in your browser. Try MP4 or JPG.'))};
   el.src=url;
  });
 } finally {if(el){el.onloadedmetadata=el.onload=el.onerror=null;el.removeAttribute('src');if(video)el.load()}URL.revokeObjectURL(url)}
 return file;
}

function showPhotoCrop(img){photoSource=null;openDialog(`<h2>CROP YOUR PICTURE</h2><canvas id="vs-canvas" width="512" height="512" aria-label="Profile picture crop preview"></canvas><label class="field"><span>Zoom</span><input id="vs-zoom" type="range" min="1" max="3" step="0.05" value="1"></label><label class="field"><span>Horizontal position</span><input id="vs-x" type="range" min="0" max="100" value="50"></label><label class="field"><span>Vertical position</span><input id="vs-y" type="range" min="0" max="100" value="50"></label><button class="btn" data-vs="save-crop">Use this picture</button>`,'Crop profile picture');cropImage=img;cropDraw()}
function cropDraw(){if(!cropImage)return;let c=document.getElementById('vs-canvas');if(!c)return;const z=Number(document.getElementById('vs-zoom').value),fx=Number(document.getElementById('vs-x').value)/100,fy=Number(document.getElementById('vs-y').value)/100;const side=Math.min(cropImage.width,cropImage.height)/z;c.getContext('2d').drawImage(cropImage,(cropImage.width-side)*fx,(cropImage.height-side)*fy,side,side,0,0,512,512)}
document.addEventListener('change',async e=>{if(e.target.id==='vs-kind'){const dialog=e.target.closest('dialog');const title='Create '+e.target.value;dialog.querySelector('h2').textContent=title;dialog.setAttribute('aria-label',title)}if(e.target.id==='vs-upload'){
const version=++uploadVersion;pending=null;uploadChecking=true;
const input=e.target,error=document.getElementById('vs-error'),preview=document.getElementById('vs-media-preview'),form=input.closest('form'),button=form.querySelector('[type=submit]');
preview.replaceChildren();error.textContent='Checking file…';button.disabled=true;
try{const file=await validateFile(input.files[0],form.querySelector('#vs-kind').value);if(version!==uploadVersion||!input.isConnected)return;
pending=file;error.textContent='';
const el=document.createElement(file.type.startsWith('video/')?'video':'img'),url=URL.createObjectURL(file);
el.src=url;el.className='vs-upload-preview';if(el.tagName==='VIDEO'){el.controls=true;el.playsInline=true}const stage=document.createElement('div');stage.className='rep-media-stage';stage.append(el);preview.append(stage);editor.sync(form);
document.getElementById('vs-dialog').addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});
}catch(err){if(version===uploadVersion&&input.isConnected)error.textContent=err.message}
finally{if(version===uploadVersion){uploadChecking=false;if(button.isConnected)button.disabled=false}}
}if(e.target.id==='vs-photo'){const file=e.target.files[0];if(!file)return;try{if(!file.type.startsWith('image/'))throw Error('Choose a JPG, PNG or WebP photo.');await validateFile(file);const url=URL.createObjectURL(file),img=new Image();await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=url});URL.revokeObjectURL(url);showPhotoCrop(img);photoSource=file}catch(err){toast(err.message||'Could not open that picture.')}}});
document.addEventListener('input',e=>{if(['vs-zoom','vs-x','vs-y'].includes(e.target.id))cropDraw()});
async function refreshCommunity(){await window.loadCommunity();render()}
document.addEventListener('submit',async event=>{
 const form=event.target;
 if(!['vs-create','vs-profile','live-checkin'].includes(form.id))return;
 event.preventDefault();const button=form.querySelector('[type=submit],button.btn');if(button.disabled)return;button.disabled=true;
 let uploaded=null,committed=false;
 try{
  if(form.id==='live-checkin'){
   await community.checkin(form.elements.step.value,form.elements.reflection.value.trim());
  }else if(form.id==='vs-profile'){
   await community.profile({display_name:form.elements.displayName.value.trim(),bio:form.elements.bio.value.trim(),discoverable:form.elements.visibility.value==='members'});
  }else{
   const kind=form.querySelector('#vs-kind').value,existing=form.dataset.editId?editableItem(kind,form.dataset.editId):null;
   if(form.dataset.editId&&!existing)throw Error('This item is unavailable.');
   if(uploadChecking || (form.querySelector('#vs-upload').files.length&&!pending))throw Error('Wait for the selected file to finish checking.');
   const text=form.querySelector('#vs-text').value.trim(),arena=form.dataset.arenaMode;
   const tags=Array.from(form.querySelectorAll('[name=taggedMember]:checked'),el=>el.value);
   if(arena==='tag'&&!replyTo&&!tags.length)throw Error('Tag a member for this challenge.');
   if(arena&&!(pending?.type||existing?.mime||'').startsWith('video/'))throw Error('Choose a video for your challenge.');
   if(kind==='reel'&&!pending&&!existing?.media)throw Error('Choose a photo or video.');
   const activity=kind==='post'?form.elements.activity.value.trim():'',place=kind==='post'?form.elements.place.value.trim():'';
   if(!text&&!activity&&!place&&!pending&&!existing?.media)throw Error('Add an update or choose a file.');
   if(pending){await validateFile(pending,kind);uploaded=await community.upload(pending)}
   const fields={body:text||(!uploaded&&!existing?.media?[activity,place].filter(Boolean).join(' · '):''),media_path:uploaded||existing?.media||null,
    media_type:pending?(pending.type.startsWith('video/')?'video':'image'):existing?.media?(isVideoMedia(existing)?'video':'image'):null,
    effects:editor.read(form),tags:cleanTags([...tags,...mentionedIds(text)]),activity,place};
   if(!existing)Object.assign(fields,{kind,challenge:arena||null,reply_to:replyTo||null});
   await community.post(fields,existing?.id);
   committed=true;
   if(uploaded&&existing?.media)await community.removeFile(existing.media).catch(()=>{});
   form.closest('dialog').close();replyTo=null;
  }
  committed=true;if(form.id==='vs-profile')form.closest('dialog')?.close();await refreshCommunity();toast('Saved');
 }catch(e){
  if(uploaded&&!committed)await community.removeFile(uploaded).catch(()=>{});
  const message=committed?'Saved. Refresh to see your update.':e.message.includes('duplicate key')?'You have already recorded this step today.':e.message;
  const status=form.querySelector('#vs-error,#vs-save-status,[role=status]');if(status?.isConnected)status.textContent=message;else toast(message);
 }finally{button.disabled=false}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-vs]');if(!b)return;const {vs:action,id,kind}=b.dataset;
 try{
  if(action==='follow'||action==='like'){
   if(b.disabled)return;b.disabled=true;
   try{
    if(action==='follow'){await community.follow(id,data.following.includes(id));await refreshCommunity()}
    else{const liked=data.likes.includes(id);await community.like(id,liked);likeCounts.set(id,Math.max(0,(likeCounts.get(id)||0)+(liked?-1:1)));const ids=(reactors.get(id)||[]).filter(person=>person!=='me');
      if(!liked)ids.push('me');
      reactors.set(id,ids);updateFaces(document.querySelector('#vs-dialog'),id);
      data.likes=liked?data.likes.filter(x=>x!==id):[...data.likes,id];document.querySelectorAll('[data-vs="like"]').forEach(el=>{if(el.dataset.id!==id)return;
      el.setAttribute('aria-pressed',String(!liked));
      const count=el.querySelector('[data-rep-count]');
      if(count)count.textContent=repTotal(likeCounts.get(id));})}
   }finally{b.disabled=false}
  }else if(['story','friend-story','view-reel','comment-reel'].includes(action)){
   const item=[...data.posts,...data.stories].find(x=>x.id===id);if(item)openMediaViewer(item,action==='comment-reel');
  }else if(action==='close-challenge'){
   if(b.disabled||!confirm('Close this challenge now and award the leading entry a bronze badge?'))return;
   b.disabled=true;
   try{await community.closeChallenge(id);await refreshCommunity();const challenge=data.posts.find(x=>x.id===id);if(challenge)openMediaViewer(challenge)}
   catch(error){
    const messages={'An entry needs at least one like before the challenge can close.':'An entry needs at least one Rep before the challenge can close.','The top entries are tied. Keep voting until one entry leads.':'The top entries are tied. Keep giving Reps until one entry leads.'};
    throw Error(messages[error.message]||error.message);
   }finally{b.disabled=false}
  }else if(action==='respond'){
   const item=data.posts.find(x=>x.id===id);if(item){composer('reel',null,item.arenaMode);replyTo=id}
  }else if(['create','tag-post','add-media'].includes(action))composer(kind||'post',null,null,action==='tag-post');
  else if(action==='filter'){tab=b.dataset.tab;render()}
  else if(action==='close')b.closest('dialog')?.close();
  else if(action==='manage-reels'||action==='manage-stories')manageMedia(action==='manage-reels'?'reel':'story');
  else if(['edit-item','replace-item','media-menu'].includes(action)){
   const item=editableItem(kind,id);if(item){if(action==='media-menu')mediaActions(item);else composer(kind,item)}
  }else if(['remove-item','delete','delete-story'].includes(action)){
   const item=[...data.posts,...data.stories].find(x=>x.id===id&&x.author==='me');
   if(item&&confirm('Delete this '+item.type+'?')){await community.deletePost(id);if(item.media)await community.removeFile(item.media).catch(()=>{});await refreshCommunity()}
   }else if(action==='delete-account'){
   const dialog=openDialog('<h2>Delete your account?</h2><p>This permanently removes your login, profile, uploads, posts, Reps and Arena progress. Entries on challenges you created are also removed. This cannot be undone.</p><div class="vs-actions"><button type="button" class="btn" data-vs="edit-profile">Keep account</button><button type="button" class="btn-outline" data-confirm-delete>Delete permanently</button></div><p role="status"></p>','Delete account');
   const confirmButton=dialog.querySelector('[data-confirm-delete]');
   confirmButton.onclick=async()=>{
    if(confirmButton.disabled)return;
    const accountId=community.identity();
    dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
    const keepOpen=event=>event.preventDefault();
    dialog.addEventListener('cancel',keepOpen);
    const status=dialog.querySelector('[role=status]');
    status.textContent='Deleting your account…';
    try{
     const {error}=await community.client.functions.invoke('delete-own-account',{body:{confirmation:'DELETE'}});
     if(error)throw error;
    }catch{
     status.textContent='Deletion could not be confirmed. Check your connection and try again.';
     dialog.removeEventListener('cancel',keepOpen);
     dialog.querySelectorAll('button').forEach(button=>button.disabled=false);
     return;
    }
    try{
     localStorage.removeItem('ravn-member-'+accountId);
     await community.client.auth.signOut({scope:'local'});
    }finally{location.replace(location.pathname+'#/login');location.reload()}
   };
  }else if(action==='edit-profile'){editProfile()
  }else if(action==='edit-photo'||action==='choose-photo'){
   const input=document.getElementById('vs-photo');input.value='';input.click();
  }else if(action==='save-crop'){
   b.disabled=true;
   try{
    const blob=await new Promise(resolve=>document.getElementById('vs-canvas').toBlob(resolve,'image/jpeg',0.88));
    const key=await community.upload(blob),old=profilePath;
    try{await community.profile({avatar_path:key})}catch(e){await community.removeFile(key).catch(()=>{});throw e}
    if(old)await community.removeFile(old).catch(()=>{});await refreshCommunity();
   }finally{b.disabled=false}
  }else if(action==='remove-photo'&&profilePath){const key=profilePath;await community.profile({avatar_path:null});await community.removeFile(key).catch(()=>{});await refreshCommunity()}
 }catch(err){toast(err.message)}
});
let refreshing=false;
async function updateFeed(){
 if(refreshing||document.hidden||!s.joined||!path().startsWith('/repbook')||document.querySelector('dialog[open],form :focus'))return;
 refreshing=true;try{await window.loadCommunity();if(!document.querySelector('dialog[open],form :focus'))render()}catch{}finally{refreshing=false}
}
setInterval(updateFeed,60000);
window.addEventListener('focus',updateFeed);

})();
