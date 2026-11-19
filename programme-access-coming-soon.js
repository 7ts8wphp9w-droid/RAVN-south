const programmeLevels=['Beginner','Intermediate','Advanced'];
function programmeAllowed(){return Boolean(community.ownerOverview())}
function advancedTrainingLocked(plan){return !community.ownerOverview() && plan.level==='Advanced' && (s.fitnessSessions?.length||0)<8}
function nutritionPlanLevel(variation){return variation<=2?'Beginner':variation<=4?'Intermediate':'Advanced'}
function legacyTrainingLevel(slug){return ['form-control','foundation'].includes(slug)?'Beginner':slug==='muscle-building'?'Intermediate':'Advanced'}
function accessLabel(){if(programmeAllowed())return '<span class="programme-access">Owner access</span>';return '<span class="programme-access paid">Coming soon</span>'}
function programmeLock(level){return `<div class="card programme-lock"><div class="eyebrow">${esc(level.toUpperCase())} · SUBSCRIPTION</div><h3>Coming soon</h3><p>All training programmes and nutrition plans require a subscription. Paid access is coming soon.</p>${btn('/membership','View membership')}</div>`}
function programmeLevelChoices(kind,diet='pescatarian',goal='bulking'){
 return section('CHOOSE YOUR LEVEL',`<div class="grid cols3 programme-levels">${programmeLevels.map((level,i)=>card(`${kind==='training'?fitnessPhoto(['beginner-strength','tempo-hypertrophy','peak-strength'][i],true):''}<div class="eyebrow">${i===0?'START HERE':'YOUR NEXT STEP'}</div><h3>${level}</h3>${accessLabel(level)}<p>${i===0?'Build your foundations with a Beginner plan.':i===1?'Develop your routine with the subscription collection.':'Explore the advanced subscription collection at the right stage for you.'}</p>${btn(kind==='nutrition'?'/nutrition/plan/'+diet+'/'+goal+'/'+[1,3,5][i]:'/fitness-programmes/level/'+level.toLowerCase(),'Explore '+level.toLowerCase(),true)}`)).join('')}</div>`);
}

