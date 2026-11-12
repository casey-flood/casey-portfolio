// Locks the /work pages after `astro build`: each page's HTML is encrypted (AES-GCM, key from PBKDF2)
// and replaced by a small password screen that decrypts it in the browser. Static hosting can't do real
// auth, so this keeps the pages unreadable without the password (no view-source, no search indexing).
// The password comes from PORTFOLIO_PASSWORD (a GitHub secret); set PORTFOLIO_PASSWORD=off to skip.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { webcrypto as crypto } from 'node:crypto';

const PASSWORD = process.env.PORTFOLIO_PASSWORD || '.';
const ROOT = 'dist/work';
const ITER = 150000;
if (PASSWORD === 'off') { console.log('protect: skipped'); process.exit(0); }
if (!existsSync(ROOT)) { console.log('protect: no dist/work, nothing to do'); process.exit(0); }

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
const b64 = (u8) => Buffer.from(u8).toString('base64');

const salt = crypto.getRandomValues(new Uint8Array(16));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);

const gate = (payload, iv) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Work — Casey Flood</title><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
:root{--bg:#0e0e12;--ink:#f2f1ec;--mut:#9a99a3;--line:#2a2a33;--acc:#8f9bff}
@media (prefers-color-scheme:light){:root{--bg:#f6f4ef;--ink:#16161a;--mut:#6b6a72;--line:#dcd9d2;--acc:#3f4fd8}}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;display:grid;place-items:center;padding:16px}
.g{width:100%;max-width:24rem}
.home{display:inline-block;margin-bottom:2.5rem;color:var(--mut);text-decoration:none;font-size:.9rem}.home:hover{color:var(--ink)}
.k{margin:0 0 .6rem;font-family:ui-monospace,Menlo,monospace;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
h1{margin:0 0 .6rem;font-size:2rem;line-height:1.1;letter-spacing:-.02em;font-weight:600}
p{margin:0 0 1.5rem;color:var(--mut);line-height:1.5}
form{display:flex;gap:.5rem}
input{flex:1;min-width:0;padding:.8rem 1rem;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--ink);font:inherit;font-size:1rem}
input:focus{outline:2px solid var(--acc);outline-offset:1px}
button{padding:.8rem 1.2rem;border-radius:99px;border:0;background:var(--ink);color:var(--bg);font:inherit;font-weight:600;cursor:pointer}
.err{min-height:1.4rem;margin-top:.75rem;color:#e0675a;font-size:.88rem}
</style></head><body>
<main class="g" id="gate" hidden>
<a class="home" href="/">← Casey Flood</a>
<p class="k">Work</p>
<h1>This part is password protected.</h1>
<p>My case studies include client work, so they’re behind a password. Enter it once and you’re in for the visit.</p>
<form id="f"><input id="pw" type="password" autocomplete="current-password" aria-label="Password" placeholder="Password" required><button>Unlock</button></form>
<div class="err" id="e" role="alert"></div>
</main>
<script>
(function(){
var D={s:"${b64(salt)}",i:"${b64(iv)}",c:"${payload}",n:${ITER}};
var u=function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})};
async function open(pw){
  var b=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:u(D.s),iterations:D.n,hash:'SHA-256'},b,{name:'AES-GCM',length:256},false,['decrypt']);
  var h=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:u(D.i)},k,u(D.c)));
  try{localStorage.setItem('cf-work',pw)}catch(e){}
  document.open();document.write(h);document.close();
}
function show(){document.getElementById('gate').hidden=false;var f=document.getElementById('f'),pw=document.getElementById('pw'),e=document.getElementById('e');pw.focus();
f.addEventListener('submit',function(ev){ev.preventDefault();e.textContent='';open(pw.value).catch(function(){e.textContent='That’s not it. Try again?';pw.select()})})}
var saved=null;try{saved=localStorage.getItem('cf-work')}catch(e){}
if(saved!==null){open(saved).catch(function(){try{localStorage.removeItem('cf-work')}catch(e){}show()})}else show();
})();
</script></body></html>`;

let n = 0;
for (const file of walk(ROOT)) {
	const html = readFileSync(file, 'utf8');
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(html)));
	writeFileSync(file, gate(b64(ct), iv));
	n++;
}
console.log(`protect: locked ${n} page(s) under /work`);
