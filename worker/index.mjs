import {staffApi} from './staff.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function searchTerms(q){return (q.match(/[\p{L}\p{N}]+/gu)||[]).slice(0,12).map(t=>'"'+t+'"*').join(' AND ')}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/staff/'))return staffApi(request,env);
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(url.pathname==='/api/health')return json({service:'irdai-cloud',database:Boolean(env.DB)});
 if(!env.DB)return json({error:'The beta database has not been connected.'},503);
 try{
 let stmt;
 if(url.pathname==='/api/stats')stmt=env.DB.prepare("SELECT kind,count(*) AS count FROM content WHERE status='published' GROUP BY kind ORDER BY count DESC");
 else if(url.pathname==='/api/evolution')stmt=env.DB.prepare("SELECT r.*,p.title AS predecessor_title,p.slug AS predecessor_slug,s.title AS successor_title,s.slug AS successor_slug FROM relationships r JOIN content p ON p.id=r.predecessor JOIN content s ON s.id=r.successor WHERE p.status='published' AND s.status='published' ORDER BY r.effective_date DESC,r.id DESC LIMIT 100");
 else if(url.pathname==='/api/themes')stmt=env.DB.prepare('SELECT id,label,tokens FROM themes WHERE enabled=1 ORDER BY position');
 else if(url.pathname==='/api/navigation')stmt=env.DB.prepare('SELECT slug,title,group_name FROM navigation ORDER BY position');
 else if(url.pathname==='/api/search'){
 const q=(url.searchParams.get('q')||'').trim(),page=Number(url.searchParams.get('page')||0),kind=url.searchParams.get('kind')||'';
 if(q.length>200||!Number.isInteger(page)||page<0||page>1000)return json({error:'Invalid search parameters'},400);
 const terms=searchTerms(q);if(q&&!terms)return json({items:[],hasMore:false});
 const filter=kind?' AND c.kind=?':'';const args=terms?[terms]:[];if(kind)args.push(kind);args.push(26,page*25);
 const cols='c.id,c.slug,c.title,c.kind,c.reference,c.document_date,c.summary';
 const sql=terms?`SELECT ${cols} FROM content_search JOIN content c ON c.id=content_search.rowid WHERE content_search MATCH ? AND c.status='published' ${filter} ORDER BY rank,c.id LIMIT ? OFFSET ?`:`SELECT ${cols} FROM content c WHERE c.status='published' ${filter} ORDER BY c.document_date DESC,c.id LIMIT ? OFFSET ?`;
 const {results}=await env.DB.prepare(sql).bind(...args).all();return json({items:results.slice(0,25),hasMore:results.length>25});
 }else if(url.pathname==='/api/content'){
 const slug=url.searchParams.get('slug');if(!slug||!/^[-a-z0-9]{1,160}$/.test(slug))return json({error:'Invalid page'},400);
 const item=await env.DB.prepare("SELECT id,slug,title,kind,body,summary,reference,document_date,source_url FROM content WHERE slug=? AND status='published'").bind(slug).first();return item?json(item):json({error:'This page has not been imported yet.'},404);
 }else if(url.pathname==='/api/relationships'){
 const id=Number(url.searchParams.get('id'));if(!Number.isSafeInteger(id)||id<1)return json({error:'Invalid document'},400);
 stmt=env.DB.prepare("SELECT r.*,p.title AS predecessor_title,p.slug AS predecessor_slug,s.title AS successor_title,s.slug AS successor_slug FROM relationships r JOIN content p ON p.id=r.predecessor JOIN content s ON s.id=r.successor WHERE (r.predecessor=? OR r.successor=?) AND p.status='published' AND s.status='published' LIMIT 100").bind(id,id);
 }else return json({error:'Not found'},404);
 const {results}=await stmt.all();return json(results);
 }catch{return json({error:'Content service unavailable'},503)}
}};
