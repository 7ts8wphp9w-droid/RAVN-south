/* Non-destructive photo/video styling inside repbook. Original files are unchanged. */
(() => {
'use strict';
const filters={Original:'none',Mono:'grayscale(1)',Warm:'sepia(.25) saturate(1.2)',Cool:'saturate(.9) hue-rotate(15deg)',Vivid:'saturate(1.5) contrast(1.1)',Soft:'contrast(.9) saturate(.85) brightness(1.08)'};
const colours={White:'#ffffff',Yellow:'#ffe47a',Pink:'#ffb9df'};
const fonts={Classic:'Arial, sans-serif',Serif:'Georgia, serif',Bold:'Arial Black, Arial, sans-serif'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pick=(map,value,fallback)=>Object.hasOwn(map,value)?value:fallback;
function clean(value={}) {value=value||{};return {text:String(value.text||'').slice(0,120),filter:pick(filters,value.filter,'Original'),colour:pick(colours,value.colour,'White'),font:pick(fonts,value.font,'Classic'),position:['top','middle','bottom'].includes(value.position)?value.position:'middle'}}
function overlay(value){const e=clean(value);return e.text?`<span class="rep-overlay rep-overlay-${e.position}" style="color:${colours[e.colour]};font-family:${fonts[e.font]}">${escape(e.text)}</span>`:''}
function wrap(html,value){const e=clean(value);return `<div class="rep-media-stage" data-effect-filter="${e.filter}">${html}${overlay(e)}</div>`}
function controls(value){const e=clean(value);const select=(name,label,map)=>`<label>${label}<select name="effect-${name}">${Object.keys(map).map(key=>`<option ${e[name]===key?'selected':''}>${key}</option>`).join('')}</select></label>`;
return `<details class="rep-effects"><summary>Text & filters</summary><p class="mini">Choose a photo or video to preview. Edits appear in repbook; the original file stays unchanged.</p><label>Text on photo or video<input name="effect-text" maxlength="120" placeholder="Add your words…" value="${escape(e.text)}"></label><div class="rep-effect-grid">${select('filter','Filter',filters)}${select('font','Font',fonts)}${select('colour','Text colour',colours)}${select('position','Text position',{top:1,middle:1,bottom:1})}</div><button type="button" class="btn-soft" data-reset-effects>Reset text & filters</button></details>`}
function read(form){return clean(Object.fromEntries(['text','filter','font','colour','position'].map(key=>[key,form.elements['effect-'+key]?.value])))}
function sync(form){const e=read(form);form.querySelectorAll('.rep-media-stage').forEach(stage=>{stage.dataset.effectFilter=e.filter;stage.querySelectorAll('.rep-overlay').forEach(node=>node.remove());stage.insertAdjacentHTML('beforeend',overlay(e))})}
function bind(form){form.addEventListener('input',event=>{if(event.target.name?.startsWith('effect-'))sync(form)});form.addEventListener('change',event=>{if(event.target.name?.startsWith('effect-'))sync(form)});form.querySelector('[data-reset-effects]').onclick=()=>{const e=clean();for(const [key,value] of Object.entries(e))form.elements['effect-'+key].value=value;sync(form)}}
window.repMediaEditor={clean,overlay,wrap,controls,read,sync,bind};
})();
