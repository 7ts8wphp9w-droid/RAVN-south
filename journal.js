const journalSections = {
  checkin: {title:'Check-in', points:5, prompt:'How are you feeling today, and which of the five steps are you working on?'},
  training: {title:'Training', points:10, prompt:'What movement, training or recovery did you make time for today?'},
  nutrition: {title:'Nutrition', points:10, prompt:'What food or drink choices supported you today?'},
  accountability: {title:'Accountability', points:5, prompt:'What did you commit to today, and how did you follow through?'},
  reflection: {title:'Reflection', points:5, prompt:'What did you learn today, and what will you take into tomorrow?'},
  challenge: {title:'Monthly consistency challenge', points:20, prompt:'How have you stayed consistent this month?'}
};
const journalMinimumWords = 10;
const journalStates = new WeakMap();
const journalCalendar = new Intl.DateTimeFormat('en-GB', {
  timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit'
});

function journalDay(){
  return journalCalendar.format(new Date()).split('/').reverse().join('-');
}

function journalWordCount(text){
  return (text.normalize('NFC').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
}

function journalState(){
  if(!journalStates.has(s)){
    journalStates.set(s, {drafts:new Map(), entries:null, loading:false, issue:false, pending:null, open:new Set()});
  }
  const state=journalStates.get(s);
  const day=journalDay();
  if(state.day!==day){
    state.day=day;
    state.drafts.clear();
    state.open.clear();
    state.workout=null;
    state.entries=null;
  }
  return state;
}

function journalRoute(section, repbook=false){
  return (repbook?'/repbook/journal':'/journal')+(section?'?section='+section:'');
}
function onJournal(){
  return path()==='/journal'||path()==='/repbook/journal';
}

function journalProgressMeter(){
  return `<div class="dash-points"><strong>${s.points.toLocaleString('en-GB')} points</strong><small>${pointsPerRank-rankProgress()} to next level</small><progress value="${rankProgress()}" max="${pointsPerRank}" aria-label="Progress to next level"></progress></div>`;
}

async function loadJournalEntries(state,refresh=false){
  if(state.loading&&!refresh)return;
  const request=Symbol();
  state.loading=request;
  let entries;
  try{
    entries=await community.journalEntries();
  }catch{
    // Keep the saved state available if the history request fails.
  }
  if(state.loading!==request)return;
  state.loading=false;
  state.issue=!entries;
  if(entries)state.entries=entries;
  if(journalStates.get(s)===state && onJournal()){
    const panel=document.querySelector('[data-journal-history]');
    if(panel)panel.innerHTML=journalHistory(state);
  }
}

function journalEntryCard(key, state){
  const section=journalSections[key];
  const period=key==='challenge'?state.day.slice(0,7)+'-01':state.day;
  const done=s.logs.some(log=>log.key===key&&log.period===period);
  const draft=state.drafts.get(key)||{};
  const words=journalWordCount(draft.entry||'');
  return `<details class="card journal-entry" data-journal-section="${key}" ${state.open.has(key)?'open':''}>
    <summary><span>${section.title}</span><span class="journal-entry-state">${done?'✓ Completed':'+'+section.points+' pts'}</span></summary>
    ${done?'<p class="journal-saved">Points recorded.</p>':`<form data-journal-entry="${key}">
      <label class="field" for="journal-${key}">${section.prompt}</label>
      ${key==='checkin'?`<label class="field">Your step<select name="step" required><option value="">Choose a step</option>${trophySteps.map(([,name])=>`<option ${draft.step===name?'selected':''}>${name}</option>`).join('')}</select></label>`:''}
      <textarea id="journal-${key}" name="entry" rows="4" required maxlength="${key==='checkin'?500:2000}" aria-describedby="journal-${key}-count">${esc(draft.entry||'')}</textarea>
      <div class="journal-entry-actions">
        <span id="journal-${key}-count" class="journal-count">${words} / ${journalMinimumWords} words minimum</span>
        <button class="btn" type="submit" ${words<journalMinimumWords||state.pending?'disabled':''}>Save and complete</button>
      </div>
      <p class="journal-status" role="status"></p>
    </form>`}
  </details>`;
}

function journalHistory(state){
  if(state.issue)return '<p>Could not load your entries. <button type="button" class="btn-outline" data-journal-retry>Try again</button></p>';
  if(!state.entries)return '<p role="status">Loading your entries…</p>';
  if(!state.entries.length)return '<p>Your saved entries will appear here.</p>';
  return state.entries.map(({action,activity_day,entry,step})=>{
    const date=new Date(activity_day+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'});
    return `<details class="journal-past"><summary><span>${journalSections[action].title}${step?' · '+esc(step):''}</span><time datetime="${activity_day}">${date}</time></summary><p>${esc(entry)}</p></details>`;
  }).join('');
}

function journal(repbook=false){
  if(!s.joined)return pageHero('JOURNAL','','Log in to write in your Journal.')+section('YOUR JOURNAL',btn('/login','Log in'));
  const state=journalState();
  const requested=new URLSearchParams(location.hash.split('?')[1]).get('section');
  if(requested!==state.requested){
    state.requested=requested;
    if(Object.hasOwn(journalSections,requested))state.open.add(requested);
  }
  if(!state.entries&&!state.issue)void loadJournalEntries(state);
  const keys=Object.keys(journalSections).filter(key=>key!=='challenge'||requested==='challenge');
  if(keys.includes(requested))keys.splice(0,0,...keys.splice(keys.indexOf(requested),1));
  const leaderboard=`<section class="journal-panel card" aria-labelledby="journal-leaderboard"><h2 id="journal-leaderboard">Monthly leaderboard</h2>${journalLeaderboard()}</section>`;
  const checkins=`<section class="journal-daily" aria-labelledby="journal-daily"><h2 id="journal-daily">Today’s Journal</h2><p>Write at least 10 words in each section to complete it and earn points. Your entries are private.</p>${keys.map(key=>journalEntryCard(key,state)).join('')}</section>`;
  const body=`<div class="journal-page">
    <header class="journal-heading"><h1>Journal</h1><p>${esc(s.name)} · Level ${level()}</p>${journalProgressMeter()}</header>
    ${requested==='leaderboard'?leaderboard+checkins:checkins+leaderboard}
    <section class="journal-panel card" aria-labelledby="journal-history"><h2 id="journal-history">Recent entries</h2><div data-journal-history>${journalHistory(state)}</div></section>
  </div>`;
  return repbook?window.ravnRepbookWrap(body):`<div class="wrap">${body}</div>`;
}

function rememberJournalWorkout(program, exercises){
  journalState().workout={program,exercises};
}

document.addEventListener('toggle',event=>{
  const key=event.target.dataset?.journalSection;
  if(!key||!s.joined||!event.target.isConnected)return;
  const {open}=journalState();
  if(event.target.open)open.add(key);
  else open.delete(key);
},true);

document.addEventListener('input',event=>{
  const form=event.target.closest('[data-journal-entry]');
  if(!form)return;
  const state=journalState();
  const entry=form.elements.entry.value;
  const count=journalWordCount(entry);
  state.drafts.set(form.dataset.journalEntry,{entry,step:form.elements.step?.value});
  form.querySelector('.journal-count').textContent=`${count} / ${journalMinimumWords} words minimum`;
  form.querySelector('button').disabled=!!state.pending||count<journalMinimumWords;
});

document.addEventListener('click',event=>{
  const retry=event.target.closest('[data-journal-retry]');
  if(retry){
    retry.disabled=true;
    void loadJournalEntries(journalState());
  }
});

document.addEventListener('submit',async event=>{
  const form=event.target;
  const key=form.dataset.journalEntry;
  if(!key)return;
  event.preventDefault();
  const state=journalState();
  const entry=form.elements.entry.value.trim();
  const step=form.elements.step?.value;
  const button=form.querySelector('button');
  const status=form.querySelector('[role=status]');
  if(state.pending||journalWordCount(entry)<journalMinimumWords)return;
  state.pending=key;
  button.disabled=true;
  form.elements.entry.readOnly=true;
  if(form.elements.step)form.elements.step.disabled=true;
  status.textContent='Saving…';
  let message;
  try{
    const row=await community.recordJournalEntry(key,entry,step);
    if(journalStates.get(s)!==state)return;
    if(row){
      s.logs.unshift(journalProgressLog(row));
      s.points+=row.points;
      if(key==='training'&&state.workout){
        const {program,exercises}=state.workout;
        s.fitnessSessions=[...(s.fitnessSessions||[]),{date:new Date().toISOString(),program:program.id,exercises}];
        s.program=program.title;
        state.workout=null;
      }
      message=`+${row.points} points · ${journalSections[key].title} completed`;
      if(key==='checkin')void window.loadCommunity().catch(()=>{});
    }else{
      await syncJournalProgress();
      message='This section has already been completed for this period.';
    }
    if(journalStates.get(s)!==state)return;
    state.drafts.delete(key);
    save();
    void loadJournalEntries(state,true);
  }catch{
    if(form.isConnected)status.textContent='Could not confirm your entry was saved. Please try again.';
  }finally{
    state.pending=null;
    if(journalStates.get(s)===state){
      if(message){
        if(onJournal())render();
        toast(message);
      }else{
        if(form.isConnected){
          form.elements.entry.readOnly=false;
          if(form.elements.step)form.elements.step.disabled=false;
        }
        for(const current of document.querySelectorAll('[data-journal-entry]')){
          current.querySelector('button').disabled=journalWordCount(current.elements.entry.value)<journalMinimumWords;
        }
      }
    }
  }
});
