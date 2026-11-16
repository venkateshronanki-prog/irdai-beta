import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalogue,queryCatalogue} from '../public/catalogue-service.mjs';
const source=JSON.parse(readFileSync(new URL('../public/catalogue.json',import.meta.url)));
test('exported changes round trip without mutating deployed catalogue',()=>{const proposed=structuredClone(source);proposed.records[0].title='Proposed title';const next=validateCatalogue(JSON.parse(JSON.stringify(proposed)));assert.equal(queryCatalogue(next,'content?slug='+source.records[0].slug).title,'Proposed title');assert.notEqual(source.records[0].title,'Proposed title')});
test('rejects unsafe theme tokens and large document bodies',()=>{const c=structuredClone(source);c.themes[0].tokens=JSON.stringify({background:'url(https://unsafe.example)'});assert.throws(()=>validateCatalogue(c));const large=structuredClone(source);large.records[0].body='x'.repeat(5001);assert.throws(()=>validateCatalogue(large))});
test('punctuation-only search returns no results',()=>assert.equal(queryCatalogue(source,'search?q=---').items.length,0));
