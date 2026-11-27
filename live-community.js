const recoveryRedirect = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
const community = (() => {
  const client = window.supabase.createClient('https://boalacuzelujpifbbptm.supabase.co','sb_publishable_WkJOLNBIHKTrU7Jyr1aLvg_tIt1JVtI');
  const bucket = client.storage.from('vault-media');
  let loginReward = null;
  let user = null, ownerOverview = null;
  async function result(request) {
    const {data,error}=await request;
    if(error) throw new Error(error.message);
    return data;
  }
  function identity(){if(!user)throw Error('Log in to continue.');return user.id}
  async function rows(table,...sort){
    const records=[];
    const orderedColumns=sort.length?sort:['id'];
    for(let offset=0;;offset+=500){
      const query=client.from(table).select('*');
      for(const column of orderedColumns)query.order(column);
      const page=await result(query.range(offset,offset+499));
      records.push(...page);
      if(page.length<500)return records;
    }
  }
  async function snapshot(){
    const [profiles,posts,likes,follows,comments,scores,own,months,results,expiryAlerts,levels]=await Promise.all([
      rows('vault_profiles'),rows('vault_posts'),rows('vault_likes','post_id','user_id'),rows('vault_follows','follower_id'),
      rows('vault_comments','created_at'),rows('arena_step_scores','user_id'),result(client.from('vault_progress').select('*').eq('user_id',identity())),result(client.from('arena_full_month_leaders').select('month,days').eq('user_id',identity()).limit(1)),rows('arena_challenge_results','challenge_id'),rows('vault_expiry_alerts','post_id'),rows('vault_member_levels')]);
    return {profiles,posts,likes,follows,comments,scores,own,months,results,expiryAlerts,levels,daily:loginReward};
  }
  async function journalProgress(){
    const accountId=identity(), actions=[];
    for(let offset=0;;offset+=500){
      const page=await result(client.from('vault_dashboard_actions').select('action,activity_day,period,points')
        .eq('user_id',accountId).order('activity_day',{ascending:false}).order('action').range(offset,offset+499));
      actions.push(...page);
      if(page.length<500)return actions;
    }
  }
  async function recordJournalEntry(action,entry,step){
    const rows=await result(client.from('vault_dashboard_actions')
      .upsert({user_id:identity(),action,entry,step:step||null},{onConflict:'user_id,action,period',ignoreDuplicates:true})
      .select('action,activity_day,period,points'));
    return rows[0];
  }
  async function journalEntries(start,end){
    const accountId=identity();
    const entriesQuery=columns=>client.from('vault_dashboard_actions').select(columns)
      .eq('user_id',accountId).not('entry','is',null);
    const checkinsQuery=columns=>client.from('vault_checkins').select(columns).eq('user_id',accountId);
    const weekFor=(query,columns,dateColumn,orderColumn)=>Promise.all([
      result(query(columns).gte(dateColumn,start).lte(dateColumn,end)
        .order(dateColumn,{ascending:false}).order(orderColumn)),
      result(query(dateColumn).lt(dateColumn,start).order(dateColumn,{ascending:false}).limit(1)),
      result(query(dateColumn).gt(dateColumn,end).order(dateColumn).limit(1))
    ]);
    const [[entries,olderEntries,newerEntries],[checkins,olderCheckins,newerCheckins]]=await Promise.all([
      weekFor(entriesQuery,'action,activity_day,entry,step','activity_day','action'),
      weekFor(checkinsQuery,'step,day,reflection','day','step')
    ]);
    const checkinKeys=new Set(entries.filter(row=>row.action==='checkin').map(row=>row.activity_day+'/'+row.step+'/'+row.entry));
    const earlier=checkins.filter(row=>!checkinKeys.has(row.day+'/'+row.step+'/'+row.reflection))
      .map(row=>({action:'checkin',activity_day:row.day,step:row.step,entry:row.reflection}));
    const older=[olderEntries[0]?.activity_day,olderCheckins[0]?.day].filter(Boolean).sort().pop();
    const newer=[newerEntries[0]?.activity_day,newerCheckins[0]?.day].filter(Boolean).sort()[0];
    return {items:[...entries,...earlier].sort((a,b)=>b.activity_day.localeCompare(a.activity_day)||a.action.localeCompare(b.action)),older,newer};
  }
  async function prepare(account){
    if(user?.id!==account.id)loginReward=null;
    user=account;
    ownerOverview=null;
    const overview=await result(client.rpc('ravn_owner_overview'));
    if(user?.id!==account.id)return;
    ownerOverview=overview;
    const receipt=await result(client.rpc('arena_claim_login_badge'));
    if(user?.id!==account.id)return;
    if(receipt)loginReward=receipt;
    const row=await result(client.from('vault_profiles').select('id').eq('id',identity()).maybeSingle());
    if(user?.id!==account.id)return;
    if(!row)await result(client.from('vault_profiles').upsert({id:user.id,display_name:String(user.user_metadata?.display_name||'Member').trim().slice(0,45)||'Member'},{onConflict:'id',ignoreDuplicates:true}));
  }
  async function upload(file){
    const key=identity()+'/'+crypto.randomUUID();
    await result(bucket.upload(key,file,{contentType:file.type}));
    return key;
  }
  async function toggle(table,keys,currentlySet){
    await result(currentlySet?client.from(table).delete().match(keys):client.from(table).upsert(keys,{ignoreDuplicates:true}));
  }
  return {client,identity,prepare,snapshot,upload,journalProgress,recordJournalEntry,journalEntries,
    ownerOverview:()=>ownerOverview,
    clear(){loginReward=null;user=null;ownerOverview=null},
    signed:async key=>(await result(bucket.createSignedUrl(key,3600))).signedUrl,
    removeFile:key=>result(bucket.remove([key])),
    profile:fields=>result(client.from('vault_profiles').update(fields).eq('id',identity())),
    post:(fields,id)=>result(id?client.from('vault_posts').update(fields).eq('id',id).eq('user_id',identity()).select().single():client.from('vault_posts').insert({...fields,user_id:identity()}).select().single()),
    deletePost:id=>result(client.from('vault_posts').delete().eq('id',id).eq('user_id',identity())),
    view:async id=>{
      const {error}=await client.from('vault_media_views').insert({post_id:id,viewer_id:identity()});
      if(error && error.code!=='23505')throw Error(error.message);
    },
    like:(id,set)=>toggle('vault_likes',{post_id:id,user_id:identity()},set),
    follow:(id,set)=>toggle('vault_follows',{followed_id:id,follower_id:identity()},set),
    comment:(id,body)=>result(client.from('vault_comments').insert({post_id:id,user_id:identity(),body})),
    closeChallenge:id=>result(client.from('arena_challenge_results').insert({challenge_id:id}))
  };
})();
