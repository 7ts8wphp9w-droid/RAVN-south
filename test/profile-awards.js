/* Static profile totals; shared URLs contain only the explicitly shared snapshot. */
const profileAwardKeys=['badges','bronze','silver','gold','platinum'];
function profileAwardCounts(data=arenaTrophyData()){
 return {badges:data.badges,bronze:data.steps.reduce((n,x)=>n+x.bronze,0),silver:data.steps.reduce((n,x)=>n+x.silver,0),gold:data.steps.reduce((n,x)=>n+x.gold,0),platinum:data.platinum?1:0};
}
function profileAwardBanner(counts){
 return `<aside class="profile-award-banner" aria-label="Award totals"><div class="eyebrow">ARENA HONOURS</div><ul>${profileAwardKeys.map((key,i)=>`<li><span class="profile-award-icon"><img src="${A}profile-generic-${key}.svg" alt="" width="42" height="44" aria-hidden="true"></span><span class="profile-award-name">${['Badges','Bronze','Silver','Gold','Platinum'][i]}</span><strong aria-label="${counts[key]} ${key}${i?' trophies':''}">${counts[key].toLocaleString('en-GB')}</strong></li>`).join('')}</ul></aside>`;
}
function encodeProfileSnapshot(snapshot){return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(snapshot)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decodeProfileSnapshot(encoded){
 try{
  if(!encoded||encoded.length>2000||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
  if(value.v!==1||typeof value.name!=='string'||!value.name.trim()||value.name.length>45||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!value.counts)return null;
  if(!profileAwardKeys.every(k=>Number.isSafeInteger(value.counts[k])&&value.counts[k]>=0&&value.counts[k]<=100000000))return null;
  return {v:1,name:value.name,date:value.date,counts:Object.fromEntries(profileAwardKeys.map(k=>[k,value.counts[k]]))};
 }catch{return null;}
}
function sharedProfile(encoded){
 const profile=decodeProfileSnapshot(encoded);
 if(!profile)return pageHero('PROFILE UNAVAILABLE','THIS SHARE LINK IS INCOMPLETE.','Ask the member for a fresh profile link.');
 return pageHero('MEMBER PROFILE','DO IT. PROVE IT.','Every step is an achievement.')+section('PROFILE',`<article class="card shared-profile-card"><div class="profilehero">${avatar(profile.name)}<div><h3>${esc(profile.name)}</h3><span class="pill">RAVN South</span></div></div><p>Celebrating consistency across all five steps.</p><div class="profile-share-actions"><button class="btn-outline" data-share-profile>Share profile</button><p class="mini">Shared demo snapshot · ${esc(profile.date)}. These totals are not live or verified.</p></div>${profileAwardBanner(profile.counts)}</article>`);
}
async function shareProfileSnapshot(){
 const shared=path().startsWith('/profile/shared/');
 if(!shared&&s.visibility==='private'){toast('Your profile is private. Change visibility to share.');return;}
 const profile=shared?decodeProfileSnapshot(path().slice('/profile/shared/'.length)):{v:1,name:s.name,date:today(),counts:profileAwardCounts()};
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
