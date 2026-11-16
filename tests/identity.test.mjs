import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {verifyAccessToken} from '../worker/identity.mjs';
test('staff token verifies signature, issuer, audience and expiry',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');
 const issue=(aud='beta',exp='5m')=>new SignJWT({email:'STAFF@example.test'}).setProtectedHeader({alg:'RS256'}).setSubject('staff-1').setIssuer('https://team.cloudflareaccess.com').setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(privateKey);
 const token=await issue();assert.equal((await verifyAccessToken(token,'https://team.cloudflareaccess.com','beta',publicKey)).email,'staff@example.test');
 await assert.rejects(()=>verifyAccessToken(token,'https://other.cloudflareaccess.com','beta',publicKey));
 await assert.rejects(()=>verifyAccessToken(token,'https://team.cloudflareaccess.com','wrong-app',publicKey));
 await assert.rejects(()=>verifyAccessToken(awaitExpired(),'https://team.cloudflareaccess.com','beta',publicKey));
 async function awaitExpired(){return 'invalid-token'}
 const expired=await issue('beta',Math.floor(Date.now()/1000)-30);await assert.rejects(()=>verifyAccessToken(expired,'https://team.cloudflareaccess.com','beta',publicKey));
 const other=await generateKeyPair('RS256');await assert.rejects(()=>verifyAccessToken(token,'https://team.cloudflareaccess.com','beta',other.publicKey));
});
