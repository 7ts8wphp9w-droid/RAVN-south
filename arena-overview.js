(() => {
const play='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>';
const circle=(type,label,icon)=>`<button type="button" class="arena-upload" data-arena-upload="new" data-kind="${type}" aria-label="Upload ${label.toLowerCase()}"><span class="arena-circle">${icon}</span><strong>${label}</strong><small>Tap to upload</small></button>`;
function memberAchievements() {
 const profile = window.ravnArenaProfile?.() || {
  name: s.name,
  bio: '',
  picture: `<a href="#/profile" class="arena-profile-initial" aria-label="Edit profile">${esc(s.name.slice(0, 1))}</a>`
 };
 return `<section class="arena-member-card" aria-labelledby="arena-member-title">
  <div class="arena-member-heading"><h2 id="arena-member-title">YOUR PROFILE</h2><a href="#/profile">Edit profile</a></div>
  <div class="arena-member-identity">${profile.picture}<div><h3>${esc(profile.name)}</h3><p>${esc(profile.bio || 'Every step counts. Keep building your consistency.')}</p></div></div>
  <input id="vs-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose profile picture">
  <h3 class="arena-achievements-title">YOUR ACHIEVEMENTS</h3>
  ${profileAwardBanner(profileAwardCounts())}
  <a class="btn-outline" href="#/arena/achievements">View achievements</a>
 </section>`;
}
arena=function(){return `<section class="arena-shell wrap"><header class="arena-heading"><p class="eyebrow">RAVN SOUTH</p><h1>ARENA</h1><p>Your effort. Your reel. Your challenge.</p></header><div class="arena-upload-row">${circle('reel','Reel Challenge',play)}${circle('tag','Tag Challenge','@')}</div><div class="arena-links"><a href="#/arena/leaderboard">Leaderboard</a><a href="#/arena/achievements">Badges & trophies</a></div>${memberAchievements()}<a class="btn-outline arena-browse" href="#/vault/reels">View your reels</a><p class="mini arena-note">Uploads and tags currently save on this browser only. Shared member competitions are coming separately.</p></section>`;};

document.addEventListener('click',e=>{const button=e.target.closest('[data-arena-upload]');if(button)window.ravnArenaUpload(button.dataset.kind);});
const previousRender=render;render=function(){previousRender();document.body.classList.toggle('arena-active',path().startsWith('/arena'));};render();
})();
