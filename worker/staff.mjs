import {identity} from './identity.mjs';
import {validatedTokens} from '../public/theme-engine.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const kinds=['page','regulation','circular','notification','report','slide','dataset'];
export async function staffApi(request,env,verify=identity){
 try{
  if(!env.DB)fail('Database is not configured',503);
  const person=await verify(request,env);
  const user=await env.DB.prepare('SELECT email,role FROM staff WHERE email=? AND active=1').bind(person.email).first();
  if(!user)fail('Your account has not been assigned a staff role.',403);
  const path=new URL(request.url).pathname.slice('/api/staff'.length),method=request.method;
  if(path==='/me'&&method==='GET')return reply(user);
  if(path==='/drafts'&&method==='GET')return reply((await env.DB.prepare('SELECT * FROM drafts ORDER BY updated DESC LIMIT 200').all()).results);
  if(path==='/audit'&&method==='GET')return reply((await env.DB.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()).results);
  if(path.match(/^\/drafts\/[-a-f0-9]+\/revisions$/)&&method==='GET')return reply((await env.DB.prepare('SELECT * FROM revisions WHERE draft_id=? ORDER BY version DESC LIMIT 100').bind(path.split('/')[2]).all()).results);
  if(!['POST','PUT'].includes(method))fail('Not found',404);
  if(request.headers.get('Origin')!==new URL(request.url).origin)fail('Request origin rejected',403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('JSON required',415);
  const raw=await request.text();if(raw.length>160000)fail('Content exceeds beta limit',413);
  let data;try{data=JSON.parse(raw)}catch{fail('Invalid JSON')}
  const audit=(action,target,detail='')=>env.DB.prepare('INSERT INTO audit(actor,action,target,detail) VALUES(?,?,?,?)').bind(user.email,action,target,detail);
  const role=(allowed)=>{if(!allowed.includes(user.role))fail('Your role cannot perform this action.',403)};
  if(path==='/drafts'&&method==='POST'){
   role(['editor','administrator']);const content=validateContent(data);const id=crypto.randomUUID();
   await env.DB.batch([env.DB.prepare('INSERT INTO drafts(id,slug,title,kind,body,summary,reference,document_date,source_url,author) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,...content,user.email),audit('create',id)]);
   return reply({id},201);
  }
  if(path==='/themes'&&method==='POST'){
   role(['administrator']);if(!/^[a-z0-9-]{1,40}$/.test(data.id)||typeof data.label!=='string'||!data.label.trim()||data.label.length>80)fail('Invalid theme');
   const tokens=validatedTokens(data.tokens);if(Object.keys(tokens).length!==9)fail('Theme requires all nine supported design tokens.');
   await env.DB.batch([env.DB.prepare('INSERT INTO themes(id,label,tokens) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,tokens=excluded.tokens').bind(data.id,data.label,JSON.stringify(tokens)),audit('theme',data.id)]);return reply({saved:true});
  }
  if(path==='/relationships'&&method==='POST'){
   role(['reviewer','administrator']);
   if(!['amends','repeals','supersedes','clarifies','consolidates'].includes(data.relationship)||typeof data.evidence_note!=='string'||data.evidence_note.trim().length<20||data.evidence_note.length>3000)fail('A relationship and a reviewed evidence note are required.');
   try{if(new URL(data.evidence_url).protocol!=='https:')fail('Evidence must use HTTPS')}catch{fail('Enter a valid evidence link.')}
   const predecessor=await env.DB.prepare("SELECT id FROM content WHERE slug=? AND status='published'").bind(data.predecessor).first(),successor=await env.DB.prepare("SELECT id FROM content WHERE slug=? AND status='published'").bind(data.successor).first();
   if(!predecessor||!successor||predecessor.id===successor.id)fail('Choose two different published records by their page addresses.');
   await env.DB.batch([env.DB.prepare('INSERT INTO relationships(predecessor,successor,relationship,evidence_url,evidence_note) VALUES(?,?,?,?,?) ON CONFLICT(predecessor,successor,relationship) DO UPDATE SET evidence_url=excluded.evidence_url,evidence_note=excluded.evidence_note').bind(predecessor.id,successor.id,data.relationship,data.evidence_url,data.evidence_note),audit('relationship',data.predecessor+' → '+data.successor)]);return reply({saved:true});
  }
  const match=path.match(/^\/drafts\/([a-f0-9-]+)(?:\/(submit|approve|publish|restore))?$/);if(!match)fail('Not found',404);
  const [,id,action]=match;
  const current=await env.DB.prepare('SELECT * FROM drafts WHERE id=?').bind(id).first();if(!current)fail('Draft not found',404);
  if(data.version!==current.version)fail('This record changed. Reload before saving.',409);
  const version=current.version+1;
  // Guard table turns a stale update into a transaction failure, rolling back the whole batch.
  const guard=env.DB.prepare("INSERT INTO write_guards(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM drafts WHERE id=? AND version=?) THEN 1 ELSE 0 END").bind(id,current.version);
  const cleanup=env.DB.prepare('DELETE FROM write_guards');
  let statements=[];
  if(!action||action==='restore'){
   role(['editor','administrator']);if(user.email!==current.author)fail('Only the author may edit this draft.',403);
   let input=data;if(action==='restore'){const old=await env.DB.prepare('SELECT snapshot FROM revisions WHERE draft_id=? AND version=?').bind(id,data.restoreVersion).first();if(!old)fail('Revision not found',404);input=JSON.parse(old.snapshot)}
   const content=validateContent(input);
   statements.push(env.DB.prepare("UPDATE drafts SET slug=?,title=?,kind=?,body=?,summary=?,reference=?,document_date=?,source_url=?,status='draft',reviewer=NULL,version=?,updated=CURRENT_TIMESTAMP WHERE id=? AND version=?").bind(...content,version,id,current.version));
  }else if(action==='submit'){
   if(current.author!==user.email||!['draft','approved'].includes(current.status))fail('Only the author can submit a draft for review.',403);
   statements.push(env.DB.prepare("UPDATE drafts SET status='review',reviewer=NULL,version=?,updated=CURRENT_TIMESTAMP WHERE id=?").bind(version,id));
  }else if(action==='approve'){
   role(['reviewer','administrator']);if(current.author===user.email||current.status!=='review')fail('Review requires a different staff member and a submitted draft.',403);
   statements.push(env.DB.prepare("UPDATE drafts SET status='approved',reviewer=?,version=?,updated=CURRENT_TIMESTAMP WHERE id=?").bind(user.email,version,id));
  }else if(action==='publish'){
   role(['publisher','administrator']);if(current.author===user.email||!current.reviewer||current.status!=='approved')fail('Publishing requires independent approval.',403);
   statements.push(env.DB.prepare("INSERT INTO content(slug,title,kind,body,summary,reference,document_date,source_url,status) SELECT slug,title,kind,body,summary,reference,document_date,source_url,'published' FROM drafts WHERE id=? ON CONFLICT(slug) DO UPDATE SET title=excluded.title,kind=excluded.kind,body=excluded.body,summary=excluded.summary,reference=excluded.reference,document_date=excluded.document_date,source_url=excluded.source_url,status='published'").bind(id));
   statements.push(env.DB.prepare("UPDATE drafts SET status='published',version=?,updated=CURRENT_TIMESTAMP WHERE id=?").bind(version,id));
  }
  const snapshot=env.DB.prepare("INSERT INTO revisions(draft_id,version,snapshot,actor) SELECT id,version,json_object('slug',slug,'title',title,'kind',kind,'body',body,'summary',summary,'reference',reference,'document_date',document_date,'source_url',source_url,'status',status),? FROM drafts WHERE id=?").bind(user.email,id);
  try{await env.DB.batch([guard,...statements,snapshot,audit(action||'edit',id),cleanup])}catch(e){if(String(e).includes('CHECK constraint'))fail('This record changed. Reload before saving.',409);throw e}
  return reply({saved:true,version});
 }catch(e){return reply({error:e.status?e.message:'The staff service could not complete this request.'},e.status||500)}
}
function validateContent(data){
 const {slug,title,kind,body='',summary='',reference='',document_date=null,source_url=null}=data;
 if(typeof slug!=='string'||!/^[-a-z0-9]{1,160}$/.test(slug)||typeof title!=='string'||!title.trim()||title.length>300||!kinds.includes(kind))fail('Enter a title, valid page address and content type.');
 for(const [text,max]of [[body,120000],[summary,2000],[reference,300]])if(typeof text!=='string'||text.length>max)fail('Text exceeds its limit.');
 if(document_date&&!/^\d{4}-\d{2}-\d{2}$/.test(document_date))fail('Invalid date');
 if(source_url){try{const u=new URL(source_url);if(u.protocol!=='https:')fail('Source link must use HTTPS')}catch{fail('Invalid source link')}}
 return [slug,title.trim(),kind,body,summary,reference,document_date||null,source_url||null];
}
