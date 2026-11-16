import {createRemoteJWKSet,jwtVerify} from 'jose';
const keySets=new Map();
export async function verifyAccessToken(token,domain,aud,keys){
 const {payload}=await jwtVerify(token,keys,{issuer:domain,audience:aud,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
 if(typeof payload.email!=='string'||typeof payload.sub!=='string')throw Error('Missing identity');
 return {email:payload.email.toLowerCase(),sub:payload.sub};
}
export async function identity(request,env){
 const domain=env.ACCESS_TEAM_DOMAIN,aud=env.ACCESS_AUD;
 if(!domain||!aud||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain))throw Object.assign(Error('Staff authentication has not been configured.'),{status:503});
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token)throw Object.assign(Error('Sign in through the staff access gateway.'),{status:401});
 try{
  if(!keySets.has(domain))keySets.set(domain,createRemoteJWKSet(new URL(domain+'/cdn-cgi/access/certs')));
  return await verifyAccessToken(token,domain,aud,keySets.get(domain));
 }catch{throw Object.assign(Error('Staff session could not be verified. Sign in again.'),{status:401})}
}
