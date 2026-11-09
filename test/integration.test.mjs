import test from 'node:test';
import assert from 'node:assert/strict';
import {oracleSnapshot,fixtureRecords} from '../src/integration/prices.mjs';
import {createSource} from '../src/integration/server.mjs';
test('projection preserves original records and rejects stale/future/nonpositive prices',()=>{
 const now=Date.now(),record=fixtureRecords(now)[0],original=JSON.stringify(record);
 const out=oracleSnapshot([record,{...record,sourceTimestamp:now-20000},{...record,sourceTimestamp:now+20000},{...record,price:0}],{now});
 assert.equal(out.data.length,1);assert.equal(out.rejected,3);assert.equal(out.data[0].observedAt,now);assert.equal(JSON.stringify(record),original);
});
test('offline is not ready and never opens external dependencies',async t=>{
 const app=await createSource({PORT:'0'});await app.listen();t.after(()=>app.close());const url='http://127.0.0.1:'+app.server.address().port;
 assert.equal((await fetch(url+'/health')).status,200);assert.equal((await fetch(url+'/ready')).status,503);assert.equal((await fetch(url+'/oracle/v1/prices')).status,503);
});
test('fixture is labeled mock and token protects the price route',async t=>{
 const app=await createSource({PORT:'0',SOURCE_MODE:'fixture',INTERNAL_SERVICE_TOKEN:'local-test-token'});await app.listen();t.after(()=>app.close());const url='http://127.0.0.1:'+app.server.address().port;
 assert.equal((await fetch(url+'/oracle/v1/prices')).status,401);const r=await fetch(url+'/oracle/v1/prices',{headers:{authorization:'Bearer local-test-token'}});assert.equal(r.status,200);assert.equal((await r.json()).mock,true);
 assert.equal((await fetch(url+'/orders',{method:'POST',headers:{authorization:'Bearer local-test-token'}})).status,501);
});
test('live cannot silently start without an internal token',async()=>{await assert.rejects(createSource({SOURCE_MODE:'live'}),/token/i);});

test('all confirmed collector symbols receive explicit asset and quote without changing collectors',async()=>{
 const {confirmedSymbols}=await import('../src/catalog/confirmed-symbols.js');
 const now=Date.now(),records=confirmedSymbols.flatMap(item=>Object.entries(item.sources).filter(([,pair])=>pair).map(([source,sourceSymbol])=>({source,symbol:item.symbol,sourceSymbol,price:12.5,sourceTimestamp:null,fetchedAt:now})));
 const result=oracleSnapshot(records,{now});assert.equal(result.data.length,records.length);assert.equal(result.rejected,0);assert.equal(new Set(result.data.map(p=>p.asset)).size,31);
 for(const p of result.data){assert.equal(p.quote,'USDT');assert.ok(p.symbol.endsWith('USDT'));}
});
test('real normalizer output reaches the adapter; ambiguous/mismatched identities stay rejected',async()=>{
 const {normalizeBinancePrices,normalizeBiquotePrices}=await import('../src/normalizers/price.normalizer.js');
 const now=Date.now();const records=normalizeBinancePrices([{symbol:'NVDABUSDT',price:'120.25'},{symbol:'BTCUSDT',price:'60000'}]);
 const result=oracleSnapshot(records,{now:Date.now()});assert.deepEqual(result.data.map(p=>[p.asset,p.quote,p.symbol]),[['NVDA','USDT','NVDABUSDT'],['BTC','USDT','BTCUSDT']]);
 assert.equal(oracleSnapshot([{...records[0],quote:'USD'},{...records[0],sourceSymbol:'NVDAUSD'},{...records[0],source:'UNKNOWN'}]).data.length,0);
 const closed=normalizeBiquotePrices([{symbol:'XAUUSDT',mid:'2600',lastQuoteAt:new Date(now).toISOString(),marketState:'closed'}]);assert.equal(oracleSnapshot(closed).data.length,0);
});
