/* Static award artwork shared by the Arena and profile totals. */
const awardStories={fire:'A rising flame and an upward path honour the decision to begin.',ice:'An ascending mountain trail and crystal summit honour perseverance.',earth:'A rooted tree and growth rings celebrate the progress you have earned.',water:'A continuous wave and balanced sphere represent a sustainable rhythm.',lightning:'Lightning striking from storm clouds to solid ground represents maintaining your momentum through changing conditions.'};
function arenaElementArt(id){
 const index=['fire','ice','earth','water','lightning'].indexOf(id),x=(index%3)*50,y=Math.floor(index/3)*100;
 return `<span class="award-photo medal-photo element-${id}" style="--art-x:${x}%;--art-y:${y}%" aria-hidden="true"></span>`;
}
function trophyArt(tier,id='fire'){
 if(tier==='platinum')return `<span class="award-photo platinum-photo" aria-hidden="true"><img src="${A}platinum-five-elements-real.png" alt="" width="1024" height="1536" loading="lazy"></span>`;
 const index=['fire','ice','earth','water','lightning'].indexOf(id),row=['bronze','silver','gold'].indexOf(tier);
 return `<span class="award-photo trophy-photo element-${id}" style="--art-x:${index*25}%;--art-y:${row*50}%;--lightning-tier-x:${row*50}%" aria-hidden="true"></span>`;
}
