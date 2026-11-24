(() => {
  const previousRender=render;
  let account=null, ready=false, issue='', destination='/repbook',generation=0;
  let recovering = recoveryRedirect;
  render=function(){
    const route=path();
    const forgot=route==='/forgot-password';
    const auth=recovering||forgot||route==='/signup'||route==='/login';
    if(route==='/privacy' || (ready && account && !auth && route!=='/')){
      document.body.classList.remove('gateway-active');
      previousRender();
      return;
    }
    if(!auth && route!=='/' && /^\/[a-z0-9/-]+$/i.test(route))destination=route;
    document.body.classList.remove('repbook-social','arena-active');
    document.body.classList.add('gateway-active');
    const signup=route==='/signup';
    let body;
    if(issue)body='<p role="alert">'+esc(issue)+'</p><button class="gate-primary" data-retry>Try again</button>';
    else if(!ready)body='<p role="status">Opening ravnsouth…</p>';
    else if(recovering && account)body=`<form class="gate-form" id="new-password-form"><h1>Set a new password</h1>
      <label>New password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
      <label>Confirm password<input name="repeat" type="password" autocomplete="new-password" required></label>
      <p role="status"></p><button class="gate-primary">Save new password</button></form>`;
    else if(forgot || recovering)body=`<form class="gate-form" id="reset-request"><h1>Reset password</h1>
      <p class="mini"><a href="#/privacy">Privacy notice</a></p>
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <p role="status">${recovering?'Open a fresh recovery link to continue.':''}</p><button class="gate-primary">Send reset link</button>
      <a href="#/login">Back to login</a></form>`;
    else if(account)body='<nav><a class="gate-primary" style="width:min(100%, 15rem)" href="#/home">Enter site</a></nav>';
    else if(auth)body=`<form class="gate-form" id="gateway-form"><h1>${signup?'Join ravnsouth':'Log in'}</h1>
      <p class="mini"><a href="#/privacy">Privacy notice</a></p>
      ${signup?'<label>Display name<input name="displayName" required minlength="2" maxlength="45" autocomplete="nickname"></label>':''}
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>Password<input name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" ${signup?'minlength="8"':''} required></label>
      <p role="status" id="gate-status"></p><button class="gate-primary">${signup?'Create free account':'Log in'}</button>
      ${signup?'':'<a href="#/forgot-password">Forgot password?</a>'}
      <a href="#/${signup?'login':'signup'}">${signup?'Already a member? Log in':'Create a free account'}</a></form>`;
    else body='<p>Join Repbook and Arena with a free account.</p><nav><a class="gate-primary" href="#/signup">Sign up free</a><a class="gate-secondary" href="#/login">Log in</a></nav>';
    document.getElementById('app').innerHTML=`<main class="gate"><section class="gate-brand"><img src="./assets/ravn-angular-logo.png" alt="ravnsouth">${body}</section>${!auth&&ready&&!issue?'<section class="gate-community"><a class="gate-book" href="#/repbook"><span><img class="repbook-app-symbol" src="./assets/repbook-app-symbol.svg" alt=""></span><strong>Repbook</strong></a>'+(account?'':'<a href="#/arena">Arena</a>')+'</section>':''}</main>`;
  };
  async function session(user){
    if(user?.id===account?.id && ready && !issue)return;
    const ticket=++generation;
    account=null;ready=false;issue='';community.clear();
    s=structuredClone(defaults);render();
    try{
      if(user){
        await community.prepare(user);
        if(ticket!==generation)return;
        s={...structuredClone(defaults),...JSON.parse(localStorage.getItem('ravn-member-'+user.id)||'{}'),joined:true,tier:'Free'};
        await window.loadCommunity();
        if(ticket!==generation)return;
        account=user;
      }
      ready=true;
      if(account && !recovering && (['/signup','/login'].includes(path())||!location.hash.startsWith('#/')))navto(destination);
    }catch(e){if(ticket===generation)issue=e.message}
    if(ticket===generation)render();
  }
  save=()=>{if(account)localStorage.setItem('ravn-member-'+account.id,JSON.stringify(s))};
  document.addEventListener('click',async event=>{
    if(event.target.closest('[data-retry]'))location.reload();
    if(event.target.closest('[data-logout]')){
      const {error}=await community.client.auth.signOut({scope:'local'});
      if(error)toast(error.message);else navto('/');
    }
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;
    if(form.id==='reset-request' || form.id==='new-password-form'){
      event.preventDefault();
      const button=form.querySelector('button');
      if(button.disabled)return;
      button.disabled=true;
      const status=form.querySelector('[role=status]');
      try{
        if(form.id==='reset-request'){
          const {error}=await community.client.auth.resetPasswordForEmail(form.elements.email.value.trim(),{redirectTo:location.origin+'/'});
          if(error)throw error;
          status.textContent='If your email is registered, check your inbox for a password reset link.';
        }else{
          const password=form.elements.password.value;
          if(password!==form.elements.repeat.value)throw Error('Enter the same password in both fields.');
          const {error}=await community.client.auth.updateUser({password});
          if(error)throw error;
          recovering=false;
          navto('/repbook');render();toast('Password updated');
        }
      }catch(error){status.textContent=error.message}finally{button.disabled=false}
      return;
    }
    if(form.id!=='gateway-form')return;
    event.preventDefault();const button=form.querySelector('button');button.disabled=true;
    const status=form.querySelector('[role=status]');
    try{
      const credentials={email:form.elements.email.value.trim(),password:form.elements.password.value};
      const signup=!!form.elements.displayName;
      const name=form.elements.displayName?.value.trim();
      if(signup&&name.length<2)throw Error('Enter at least two characters for your display name.');
      const {error,data}=signup?await community.client.auth.signUp({...credentials,options:{data:{display_name:name},emailRedirectTo:location.origin+'/'}}):await community.client.auth.signInWithPassword(credentials);
      if(error)throw error;
      if(signup&&!data.session){status.textContent='Check your inbox for the confirmation link, then log in.';form.elements.password.value=''}
    }catch(e){status.textContent=e.message}finally{button.disabled=false}
  });
  render();
  community.client.auth.onAuthStateChange((event,sessionData)=>{if(event==='PASSWORD_RECOVERY')recovering=true;
    if(!sessionData && event==='SIGNED_OUT')recovering=false;
    setTimeout(()=>session(sessionData?.user),0)});
})();
