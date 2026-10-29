/* Demo access policy. Live subscriptions must be verified by a server before launch. */
const programmeLevels=['Beginner','Intermediate','Advanced'];
function hasProgrammeSubscription(){return s.joined&&['Subscription','Platinum'].includes(s.tier)}
function programmeAllowed(level){return level==='Beginner'||hasProgrammeSubscription()}
function nutritionPlanLevel(variation){return variation<=2?'Beginner':variation<=4?'Intermediate':'Advanced'}
function legacyTrainingLevel(slug){return ['form-control','foundation'].includes(slug)?'Beginner':slug==='muscle-building'?'Intermediate':'Advanced'}
function accessLabel(level){return `<span class="programme-access ${level==='Beginner'?'free':'paid'}">${level==='Beginner'?'Free':hasProgrammeSubscription()?'Subscription included':'Subscription required'}</span>`}
function programmeLock(level){return `<div class="card programme-lock"><div class="eyebrow">${esc(level.toUpperCase())} · SUBSCRIPTION</div><h3>Continue with a subscription</h3><p>Beginner training and nutrition plans are free. Intermediate and Advanced plans are included with Subscription.</p>${btn('/membership','View subscription')}${btn('/fitness-programmes/level/beginner','Free training',true)}${btn('/nutrition','Free nutrition',true)}<p class="mini">Testing site: membership selection is a demo. No payment is taken.</p></div>`}
function programmeLevelChoices(kind,diet='pescatarian',goal='bulking'){
 return section('CHOOSE YOUR LEVEL',`<div class="grid cols3 programme-levels">${programmeLevels.map((level,i)=>card(`<div class="eyebrow">${i===0?'START HERE':'YOUR NEXT STEP'}</div><h3>${level}</h3>${accessLabel(level)}<p>${i===0?'Build your foundations with free plans.':i===1?'Develop your routine with the subscription collection.':'Explore the advanced subscription collection at the right stage for you.'}</p>${btn(kind==='nutrition'?'/nutrition/plan/'+diet+'/'+goal+'/'+[1,3,5][i]:'/fitness-programmes/level/'+level.toLowerCase(),'Explore '+level.toLowerCase(),true)}`)).join('')}</div>`);
}
