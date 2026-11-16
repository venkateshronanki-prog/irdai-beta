import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.mjs';
import {validatedTokens} from '../public/theme-engine.mjs';
function setup(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_public_content.sql',import.meta.url),'utf8'));const env={DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},async all(){return {results:db.prepare(sql).all(...args)}},async first(){return db.prepare(sql).get(...args)||null}}}}};return {db,env}}
const request=(path,env)=>worker.fetch(new Request('https://beta.example/api/'+path),env);
test('missing database is explicit',async()=>assert.equal((await request('search?q=life',{})).status,503));
test('rejects writes',async()=>assert.equal((await worker.fetch(new Request('https://beta.example/api/content',{method:'POST'}),{})).status,405));
test('full text search finds body text and never exposes drafts',async()=>{const {db,env}=setup();try{db.exec("INSERT INTO content(slug,title,kind,body,status) VALUES('published','Guidance','circular','policyholder protection','published'),('private','Unpublished','circular','policyholder protection','draft')");const data=await (await request('search?q=policyholder',env)).json();assert.equal(data.items.length,1);assert.equal(data.items[0].slug,'published');assert.equal((await request('content?slug=private',env)).status,404)}finally{db.close()}});
test('index follows edits and deletes',async()=>{const {db,env}=setup();try{db.exec("INSERT INTO content(slug,title,kind,body,status) VALUES('test','Guidance','page','oldword','published')");db.exec("UPDATE content SET body='newword'");assert.equal((await (await request('search?q=oldword',env)).json()).items.length,0);assert.equal((await (await request('search?q=newword',env)).json()).items.length,1);db.exec('DELETE FROM content');assert.equal((await (await request('search?q=newword',env)).json()).items.length,0)}finally{db.close()}});
test('search punctuation cannot execute SQL or FTS operators',async()=>{const {db,env}=setup();try{for(const q of ['" OR *','DROP TABLE content;','---']){const r=await request('search?q='+encodeURIComponent(q),env);assert.equal(r.status,200)}assert.equal((await request('search?page=-1',env)).status,400);assert.ok(db.prepare('SELECT count(*) AS n FROM content').get())}finally{db.close()}});
test('theme tokens reject arbitrary CSS and URLs',()=>assert.deepEqual(validatedTokens({background:'url(https://bad.example)',text:'#172C43',radius:'8px',position:'fixed'}),{text:'#172C43',radius:'8px'}));
