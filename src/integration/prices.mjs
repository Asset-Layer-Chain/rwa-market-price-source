import {confirmedSymbols} from '../catalog/confirmed-symbols.js';

// The existing collectors emit canonical symbols, not asset/quote fields.
// Infer USDT only from an exact catalogue pair; never guess an FX conversion.
export function priceIdentity(p) {
  const item=confirmedSymbols.find(item=>item.symbol===p?.symbol);
  if(p?.sourceSymbol){
    if(!item||item.sources[p.source]!==p.sourceSymbol||!/_?USDT$/.test(p.sourceSymbol))return null;
    if((p.asset&&p.asset!==item.symbol)||(p.quote&&p.quote!=='USDT'))return null;
    return {asset:item.symbol,quote:'USDT',symbol:p.sourceSymbol};
  }
  return p?.asset&&p?.quote?{asset:p.asset,quote:p.quote,symbol:p.symbol}:null;
}
export function oracleSnapshot(records,{now=Date.now(),maxLatencyMs=10000,mock=false}={}) {
  const data=[];let rejected=0;
  for(const record of records) {
    const identity=priceIdentity(record),p=identity?{...record,...identity}:null;
    const observedAt=p?.sourceTimestamp??p?.fetchedAt;
    if(!p||!['source','asset','quote','symbol'].every(k=>typeof p[k]==='string'&&p[k].length>0)||!Number.isFinite(p.price)||p.price<=0||!Number.isFinite(observedAt)||observedAt>now+1000||now-observedAt>maxLatencyMs||p.stale===true||p.marketState&&p.marketState!=='open'){rejected++;continue;}
    data.push({source:p.source,asset:p.asset,quote:p.quote,symbol:p.symbol,price:p.price,observedAt,maxLatencyMs});
  }
  return {generatedAt:now,data,mock,rejected,tradingReady:false};
}
export function fixtureRecords(now=Date.now()) {
  return [{source:'FIXTURE',asset:'BTC',quote:'USDT',symbol:'BTCUSDT',price:60000,sourceTimestamp:now,fetchedAt:now}];
}
