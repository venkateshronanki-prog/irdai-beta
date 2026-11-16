const colors=new Set(['background','surface','text','muted','accent','border']);
export function validatedTokens(tokens){
 const result={};
 for(const [key,value] of Object.entries(tokens||{})){
  if(colors.has(key)&&/^#[0-9a-f]{6}$/i.test(value))result[key]=value;
  if(key==='font'&&['system-ui','Georgia','Arial'].includes(value))result[key]=value;
  if(['radius','spacing'].includes(key)&&/^([0-9]|[12][0-9]|3[0-2])px$/.test(value))result[key]=value;
 }
 return result;
}
export function applyTheme(theme,root=document.documentElement){
 for(const [key,value] of Object.entries(validatedTokens(theme.tokens)))root.style.setProperty('--'+key,value);
 root.dataset.theme=theme.id;
 try{localStorage.setItem('irdai-theme-id',theme.id)}catch{}
}
