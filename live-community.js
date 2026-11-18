const community = (() => {
  const client = window.supabase.createClient('https://boalacuzelujpifbbptm.supabase.co','sb_publishable_WkJOLNBIHKTrU7Jyr1aLvg_tIt1JVtI');
  const bucket = client.storage.from('vault-media');
  let user = null;
  async function result(request) {
    const {data,error}=await request;
    if(error) throw new Error(error.message);
    return data;
  }
  function identity(){if(!user)throw Error('Log in to continue.');return user.id}
  async function rows(table,sort='id'){
    const records=[];
    for(let offset=0;;offset+=500){
      const page=await result(client.from(table).select('*').order(sort).range(offset,offset+499));
      records.push(...page);
      if(page.length<500)return records;
    }
  }
  async function snapshot(){
    const [profiles,posts,likes,follows,comments,scores,own,months]=await Promise.all([
      rows('vault_profiles'),rows('vault_posts'),rows('vault_likes','post_id'),rows('vault_follows','follower_id'),
      rows('vault_comments','created_at'),rows('arena_step_scores','user_id'),result(client.from('vault_progress').select('*').eq('user_id',identity())),result(client.from('arena_full_month_leaders').select('month,days').eq('user_id',identity()).limit(1))]);
    return {profiles,posts,likes,follows,comments,scores,own,months};
  }
  async function prepare(account){
    user=account;
    const row=await result(client.from('vault_profiles').select('id').eq('id',identity()).maybeSingle());
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
  return {client,identity,prepare,snapshot,upload,clear(){user=null},
    signed:async key=>(await result(bucket.createSignedUrl(key,3600))).signedUrl,
    removeFile:key=>result(bucket.remove([key])),
    profile:fields=>result(client.from('vault_profiles').update(fields).eq('id',identity())),
    post:(fields,id)=>result(id?client.from('vault_posts').update(fields).eq('id',id).eq('user_id',identity()).select().single():client.from('vault_posts').insert({...fields,user_id:identity()}).select().single()),
    deletePost:id=>result(client.from('vault_posts').delete().eq('id',id).eq('user_id',identity())),
    like:(id,set)=>toggle('vault_likes',{post_id:id,user_id:identity()},set),
    follow:(id,set)=>toggle('vault_follows',{followed_id:id,follower_id:identity()},set),
    comment:(id,body)=>result(client.from('vault_comments').insert({post_id:id,user_id:identity(),body})),
    checkin:(step,reflection)=>result(client.from('vault_checkins').insert({user_id:identity(),step,reflection}))
  };
})();
