/* Static profile totals; shared URLs contain only the explicitly shared snapshot. */
const profileAwardKeys=['badges','bronze','silver','gold','platinum'];
function profileAwardCounts(data=arenaTrophyData()){
 return {badges:data.badges,bronze:data.steps.reduce((n,x)=>n+x.bronze,0),silver:data.steps.reduce((n,x)=>n+x.silver,0),gold:data.steps.reduce((n,x)=>n+x.gold,0),platinum:data.platinum?1:0};
}
function hiddenHonoursDisplay(){
 const owned=new Set(Array.isArray(s.hiddenHonours)?s.hiddenHonours:[]);
 const honours=[['gym-rat','Gym Rat'],['the-goat','The Goat'],['the-raven','The Raven']].map(([id,name],index)=>{
  const earned=owned.has(id);
  const title=earned?name:`Hidden honour ${index+1}`;
  const artwork=earned?`<span class="hidden-honour-art"><img src="./assets/hidden-honours/${id}.webp" alt="" loading="lazy"></span>`:'<span class="hidden-honour-shadow" aria-hidden="true"></span>';
  return `<div class="hidden-honour" role="listitem" aria-label="${title}: ${Number(earned)} owned">${artwork}<b aria-hidden="true">${Number(earned)}</b>${earned?`<small aria-hidden="true">${name}</small>`:''}</div>`;
 }).join('');
 return `<section class="hidden-honours" aria-label="Hidden Honours"><h3 class="hidden-honours-title">Hidden Honours</h3><div class="hidden-honours-row" role="list">${honours}</div></section>`;
}
function awardGallery({steps=arenaTrophyData().steps,platinum=arenaTrophyData().platinum,linkToAchievements=false,showHiddenHonours=true}={}){
 const cell=(row,column,label,count,badgeName='')=>`<div class="collection-award" aria-label="${label}: ${count}">${badgeName?`<small class="collection-badge-name" aria-hidden="true">${esc(badgeName)}</small>`:''}<span aria-hidden="true" style="background-position:${column*25}% ${row*25}%"></span><b aria-hidden="true">${count.toLocaleString('en-GB')}</b></div>`;
 const stepNames=new Map(trophySteps);
 const tiers=['badges','bronze','silver','gold'];
 const gallery='<div class="collection-gallery" role="group" aria-label="Badges and trophies">'+tiers.map((tier,row)=>steps.map((step,column)=>cell(row,column,stepNames.get(step.id)+' '+tier,step[tier],row===0?stepNames.get(step.id):'')).join('')).join('')+cell(4,0,'Platinum',Number(platinum))+'</div>';
 const collection=linkToAchievements?`<a class="profile-awards-link" href="#/repbook/achievements" aria-label="Open badges and trophies">${gallery}</a>`:gallery;
 return collection+(showHiddenHonours?hiddenHonoursDisplay():'');
}
function snapshotGallery(profile){
 if(profile.badgeSteps){
  const steps=trophySteps.map(([id],i)=>{
   const badges=profile.badgeSteps[i];
   return {id,badges,bronze:profile.bronzeSteps?.[i]??Math.floor(badges/10),silver:profile.silverSteps?.[i]??Math.floor(badges/50),gold:Math.floor(badges/100)};
  });
  return awardGallery({steps,platinum:profile.counts.platinum,showHiddenHonours:false});
 }
 return '<p>'+profileAwardKeys.map(k=>profile.counts[k]+' '+k).join(' · ')+'</p>';
}
function encodeProfileSnapshot(snapshot){return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(snapshot)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decodeProfileSnapshot(encoded){
 try{
  if(!encoded||encoded.length>2000||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
  if(value.v!==1||typeof value.name!=='string'||!value.name.trim()||value.name.length>45||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!value.counts)return null;
  if(!profileAwardKeys.every(k=>Number.isSafeInteger(value.counts[k])&&value.counts[k]>=0&&value.counts[k]<=100000000))return null;
  const {badgeSteps,bronzeSteps,silverSteps}=value;
  const validSteps=steps=>steps===undefined||(Array.isArray(steps)&&steps.length===trophySteps.length&&steps.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000));
  if(![badgeSteps,bronzeSteps,silverSteps].every(validSteps))return null;
  const memberLevel=Number.isSafeInteger(value.level)&&value.level>=1?value.level:null;
  return {v:1,badgeSteps,bronzeSteps,silverSteps,level:memberLevel,name:value.name,date:value.date,counts:Object.fromEntries(profileAwardKeys.map(k=>[k,value.counts[k]]))};
 }catch{return null;}
}
function sharedProfile(encoded){
 const profile=decodeProfileSnapshot(encoded);
 if(!profile)return pageHero('PROFILE UNAVAILABLE','THIS SHARE LINK IS INCOMPLETE.','Ask the member for a fresh profile link.');
 return pageHero('MEMBER PROFILE','DO IT. PROVE IT.','Every step is an achievement.')+section('PROFILE',`<article class="card shared-profile-card"><div class="profilehero">${profilePhotoWithLevel(avatar(profile.name),profile.level)}<div><h3>${esc(profile.name)}</h3><span class="pill">RAVN South</span></div></div><p>Celebrating consistency across all five steps.</p><div class="profile-share-actions"><button class="btn-outline" data-share-profile>Share profile</button><p class="mini">Snapshot shared on ${esc(profile.date)}.</p></div>${snapshotGallery(profile)}</article>`);
}
async function shareProfileSnapshot(){
 const shared=path().startsWith('/profile/shared/');
 if(!shared&&s.visibility==='private'){toast('Your profile is private. Change visibility to share.');return;}
 let profile;
 if(shared)profile=decodeProfileSnapshot(path().slice('/profile/shared/'.length));
 else{
  const collection=arenaTrophyData();
  profile={v:1,name:s.name,date:today(),level:level(),counts:profileAwardCounts(collection),
   badgeSteps:collection.steps.map(step=>step.badges),
   bronzeSteps:collection.steps.map(step=>step.bronze),
   silverSteps:collection.steps.map(step=>step.silver)};
 }
 if(!profile)return;
 const url=new URL(location.href);url.hash='/profile/shared/'+encodeProfileSnapshot(profile);
 const payload={title:profile.name+' · RAVN South',text:profile.name+'’s RAVN South award collection',url:url.href};
 if(navigator.share){try{await navigator.share(payload);return;}catch(error){if(error.name==='AbortError')return;}}
 try{await navigator.clipboard.writeText(url.href);toast('Profile snapshot link copied');return;}catch{}
 document.querySelector('.profile-share-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.className='profile-share-dialog';dialog.innerHTML='<h3>Share profile</h3><p>Copy this link to share your profile snapshot.</p><label class="field"><span>Profile link</span><input readonly aria-label="Profile link"></label><button class="btn-outline" type="button">Close</button>';
 dialog.querySelector('input').value=url.href;dialog.querySelector('button').onclick=()=>{dialog.close();dialog.remove();};document.body.append(dialog);dialog.showModal();dialog.querySelector('input').select();
}
document.addEventListener('click',event=>{if(event.target.closest('[data-share-profile]'))shareProfileSnapshot();});
