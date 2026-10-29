/* Trophy rules consume unique earned badges, never point balances. */
const trophySteps=[['fire','Motivation'],['ice','Determination'],['earth','Gratification'],['water','Sustainability'],['lightning','Maintenance']];
function earnedArenaBadges(){
 if(!s.joined)return [];
 const awards=Array.isArray(s.badgeAwards)?s.badgeAwards:[];
 // Retain the five existing starter badges without multiplying them by points.
 const starter=arenaBadgeData().filter(b=>b.earned).map(b=>({id:'starter-'+b.id,step:b.id}));
 return [...starter,...awards];
}
function calculateTrophies(awards,verifiedMonth=null,now=new Date()){
 const unique=new Map();
 for(const award of awards){if(award&&typeof award.id==='string'&&award.id&&trophySteps.some(([id])=>id===award.step)&&!unique.has(award.id))unique.set(award.id,award);}
 const steps=trophySteps.map(([id,name])=>{const count=[...unique.values()].filter(b=>b.step===id).length;return {id,name,badges:count,bronze:Math.floor(count/10),silver:Math.floor(count/50),gold:Math.floor(count/100)};});
 let monthlyLeader=false;
 if(verifiedMonth?.verified===true&&verifiedMonth.rank===1&&/^\d{4}-(0[1-9]|1[0-2])$/.test(verifiedMonth.month||'')){
  const [year,month]=verifiedMonth.month.split('-').map(Number),end=new Date(Date.UTC(year,month,1)),days=new Date(Date.UTC(year,month,0)).getUTCDate();
  monthlyLeader=end<=now&&verifiedMonth.daysAtNumberOne===days;
 }
 const goldReady=steps.every(step=>step.gold>=10),platinum=goldReady&&monthlyLeader;
 return {steps,badges:unique.size,goldReady,monthlyLeader,platinum,total:steps.reduce((n,x)=>n+x.bronze+x.silver+x.gold,0)+(platinum?1:0)};
}
function arenaTrophyData(){
 // No trusted monthly ranking service is connected to this local prototype.
 return calculateTrophies(earnedArenaBadges());
}
function arenaTrophyCollection(){
 const data=arenaTrophyData();
 return section('TROPHIES OF THE FIVE STEPS',`<p>Trophies are earned only through badges in the matching step.</p><div class="trophy-rules"><span><strong>10 badges</strong> = 1 bronze</span><span><strong>50 badges</strong> = 1 silver</span><span><strong>100 badges</strong> = 1 gold</span></div><p class="mini">Milestones are cumulative: badges are kept, and each new set earns another trophy. At 100 badges in one step, you have 10 bronze, 2 silver and 1 gold trophy.</p><div class="step-trophies">${data.steps.map(step=>`<article class="card"><div class="sectionhead"><div><div class="eyebrow">${step.id.toUpperCase()} · ${step.badges.toLocaleString()} BADGES EARNED</div><h3>${step.name}</h3><p class="trophy-symbol-story">${awardStories[step.id]}</p></div></div><div class="trophy-tier-grid">${[['bronze',10],['silver',50],['gold',100]].map(([tier,target])=>`<div class="tier-trophy ${tier}"><div class="element-preview trophy-preview">${trophyArt(tier,step.id)}</div><h4>${step.name} · ${tier[0].toUpperCase()+tier.slice(1)}</h4><span class="award-status ${step[tier]?'earned':''}">${step[tier]?step[tier]+' earned':'Locked'}</span><p>${target} ${step.name.toLowerCase()} badges per trophy</p><progress max="${target}" value="${step.badges%target}" aria-label="Progress to next ${step.name} ${tier} trophy"></progress><small>${target-step.badges%target} more badges to the next ${tier}</small></div>`).join('')}</div></article>`).join('')}</div>`)+section('PLATINUM · MASTER OF THE FIVE STEPS',`<article class="card platinum-trophy"><div class="platinum-art"><div class="element-preview platinum-preview">${trophyArt('platinum')}</div><span class="award-status ${data.platinum?'earned':''}">${data.platinum?'Earned':'Locked'}</span></div><div><div class="eyebrow">THE HIGHEST ARENA HONOUR</div><h3>The Five-Step Platinum Trophy</h3><p>Five sculpted elements unite around a crystal summit. Gold bands honour mastery of all five steps; the numbered halo represents a month at number one. Earn 10 gold trophies in <strong>each</strong> step and hold first place on the leaderboard for one full calendar month.</p><div class="list">${data.steps.map(step=>`<div class="list-row"><span>${step.name}</span><strong>${Math.min(10,step.gold)} / 10 gold</strong></div>`).join('')}<div class="list-row"><span>First place for a full month</span><strong>${data.monthlyLeader?'Verified':'Not verified'}</strong></div></div><p class="mini">1,000 badges per step · 5,000 badges across all five steps. Both conditions must be met. Monthly ranking verification is not connected in this testing site; sample rankings cannot unlock Platinum.</p></div></article>`);
}
