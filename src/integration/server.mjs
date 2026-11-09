import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {oracleSnapshot,fixtureRecords} from './prices.mjs';

export async function createSource(env=process.env) {
  const mode=env.SOURCE_MODE||'offline',token=env.INTERNAL_SERVICE_TOKEN||'',port=Number(env.PORT??3002),latency=Number(env.PRICE_MAX_LATENCY_MS??10000);
  if(!['offline','fixture','live'].includes(mode))throw new Error('Invalid SOURCE_MODE');
  if(!Number.isInteger(port)||port<0||port>65535||!Number.isInteger(latency)||latency<1||latency>300000)throw new Error('Invalid port or latency');
  if(mode==='live'&&token.length<24)throw new Error('live source requires INTERNAL_SERVICE_TOKEN (24+ characters)');
  let service=null,pool=null;
  if(mode==='live'){
    service=(await import('../services/market-data.service.js')).marketDataService;
    pool=(await import('../db.js')).pool;
    service.start();
  }
  const view=()=>oracleSnapshot(mode==='fixture'?fixtureRecords():service?.getAllPrices()||[],{maxLatencyMs:latency,mock:mode==='fixture'});
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://local'),data=view();
    const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
    if(req.method==='GET'&&url.pathname==='/health')return send(200,{status:'ok',service:'price-source',mode,mock:mode==='fixture',tradingReady:false});
    if(req.method==='GET'&&url.pathname==='/ready')return send(data.data.length?200:503,{ready:data.data.length>0,mode,mock:data.mock,tradingReady:false});
    const actual=Buffer.from(req.headers.authorization||''),expected=Buffer.from(`Bearer ${token}`);
    if(token&&(actual.length!==expected.length||!timingSafeEqual(actual,expected)))return send(401,{error:'Internal token required.'});
    if(req.method==='GET'&&url.pathname==='/oracle/v1/prices')return send(data.data.length?200:503,data.data.length?data:{error:'No fresh source prices available.',...data});
    send(req.method==='GET'?404:501,{error:'This read-only adapter does not implement that operation.',tradingReady:false});
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
  return {server,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,env.HOST||'127.0.0.1',()=>{server.removeListener('error',reject);resolve(server.address());});}),close:async()=>{service?.stop();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});if(pool)await pool.end();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const app=await createSource();let stopping=false;
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{if(stopping)return;stopping=true;const force=setTimeout(()=>process.exit(1),2000);force.unref();await app.close();clearTimeout(force);process.exitCode=0;});
  await app.listen();console.log(JSON.stringify({event:'listening',service:'price-source',mode:process.env.SOURCE_MODE||'offline',port:app.server.address().port}));
}
