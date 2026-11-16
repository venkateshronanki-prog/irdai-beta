import {validatedTokens} from './theme-engine.mjs';
export function validateCatalogue(c){
 if(!c||!Array.isArray(c.records)||!Array.isArray(c.relationships)||!Array.isArray(c.themes))throw Error('Invalid catalogue format');
 const slugs=new Set(),ids=new Set();for(const r of c.records){if(!Number.isSafeInteger(r.id)||ids.has(r.id)||!/^[-a-z0-9]{1,160}$/.test(r.slug)||slugs.has(r.slug)||typeof r.title!=='string'||!r.title.trim())throw Error('Record identifiers and titles must be unique and valid');ids.add(r.id);slugs.add(r.slug);if(r.source_url&&new URL(r.source_url).protocol!=='https:')throw Error('Source links must use HTTPS');if((r.body||'').length>5000)throw Error('Keep document text in the local archive; catalogue text is limited to 5,000 characters per record');}
 for(const r of c.relationships)if(!ids.has(r.predecessor)||!ids.has(r.successor)||r.predecessor===r.successor||new URL(r.evidence_url).protocol!=='https:'||!r.evidence_note)throw Error('Relationships require two valid records and official evidence');
 const themeIds=new Set();for(const t of c.themes){if(!/^[a-z0-9-]{1,40}$/.test(t.id)||themeIds.has(t.id)||!t.label)throw Error('Skin identifiers must be unique and valid');themeIds.add(t.id);const tokens=typeof t.tokens==='string'?JSON.parse(t.tokens):t.tokens;if(Object.keys(validatedTokens(tokens)).length!==9)throw Error('A skin requires all nine supported colour, font and spacing settings');t.tokens=JSON.stringify(tokens)}
 return c;
}
const words=s=>(String(s).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
export function queryCatalogue(c,path){const url=new URL(path,'https://catalogue.local/');const route=url.pathname.replace(/^\//,'');const p=url.searchParams;
 if(route==='health')return {mode:'static-catalogue',records:c.records.length};
 if(route==='themes')return c.themes;
 if(route==='stats'){const counts=new Map();for(const r of c.records)counts.set(r.kind,(counts.get(r.kind)||0)+1);return [...counts].map(([kind,count])=>({kind,count})).sort((a,b)=>b.count-a.count)}
 if(route==='search'){
  const q=p.get('q')||'',page=Number(p.get('page')||0);if(q.length>200||!Number.isInteger(page)||page<0||page>1000)throw Error('Invalid search parameters');
  const terms=words(q),kind=p.get('kind');if(q.trim()&&!terms.length)return {items:[],hasMore:false,total:0};const matches=c.records.filter(r=>!kind||r.kind===kind).map(r=>{const title=words(r.title).join(' '),text=words([r.title,r.reference,r.summary,r.body].join(' ')).join(' ');return {r,match:terms.every(t=>text.includes(t)),score:terms.reduce((n,t)=>n+(title.includes(t)?3:1),0)}}).filter(x=>x.match).sort((a,b)=>q?b.score-a.score||a.r.id-b.r.id:String(b.r.document_date||'').localeCompare(a.r.document_date||'')||a.r.id-b.r.id).map(x=>x.r);
  return {items:matches.slice(page*25,page*25+25),hasMore:matches.length>(page+1)*25,total:matches.length};
 }
 if(route==='content'){const r=c.records.find(r=>r.slug===p.get('slug'));if(!r)throw Error('This page has not been imported yet.');return r}
 if(['relationships','evolution'].includes(route)){let rows=c.relationships;if(route==='relationships')rows=rows.filter(r=>r.predecessor===Number(p.get('id'))||r.successor===Number(p.get('id')));return rows.map(r=>{const a=c.records.find(x=>x.id===r.predecessor),b=c.records.find(x=>x.id===r.successor);return {...r,predecessor_title:a.title,predecessor_slug:a.slug,successor_title:b.title,successor_slug:b.slug}})}
 throw Error('Unknown catalogue request');
}
let current;
export async function catalogueQuery(path){if(!current)current=fetch('/catalogue.json',{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('Catalogue could not be loaded.');return validateCatalogue(await r.json())}).catch(e=>{current=null;throw e});return queryCatalogue(await current,path)}
