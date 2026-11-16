// Dependency-light local runner. Cloudflare-specific validation uses Wrangler separately.
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import worker from './worker/index.mjs';
const base=path.dirname(fileURLToPath(import.meta.url));
await mkdir(path.join(base,'.local'),{recursive:true});
const db=new DatabaseSync(path.join(base,'.local/content.sqlite'));
db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY)');
for(const name of (await readdir(path.join(base,'migrations'))).filter(n=>n.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){db.exec('BEGIN');try{db.exec(await readFile(path.join(base,'migrations',name),'utf8'));db.prepare('INSERT INTO local_migrations(name) VALUES(?)').run(name);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}
const env={DB:{prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this},async all(){return {results:db.prepare(sql).all(...this.args)}},async first(){return db.prepare(sql).get(...this.args)||null}}},async batch(stmts){db.exec('BEGIN');try{const out=stmts.map(s=>db.prepare(s.sql).run(...s.args));db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}},ASSETS:{async fetch(request){let name=new URL(request.url).pathname;if(name==='/')name='/index.html';const target=path.resolve(base,'public','.'+decodeURIComponent(name));if(!target.startsWith(path.join(base,'public')+path.sep))return new Response('Forbidden',{status:403});try{const bytes=await readFile(target);return new Response(bytes,{headers:{'Content-Type':({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.pdf':'application/pdf'})[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}catch{return new Response('Not found',{status:404})}}}};
const port=Number(process.env.PORT||4175);
http.createServer(async(req,res)=>{try{let chunks=[];for await(const c of req)chunks.push(c);const request=new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch{res.writeHead(500);res.end('Local server error')}}).listen(port,'127.0.0.1',()=>console.log('Local beta: http://127.0.0.1:'+port+' (staff access remains locked until Cloudflare Access is configured)'));
