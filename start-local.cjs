'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'dist');
const port=Number(process.argv[2]||8000);
if(!Number.isInteger(port)||port<1||port>65535){console.error('Port must be an integer from 1 to 65535.');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
function reply(res,status,message){res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});res.end(message);}
const server=http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');reply(res,405,'Method not allowed');return;}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{reply(res,400,'Invalid URL');return;}
 if(name.includes('\0')||name.includes('\\')||name.split('/').some(p=>p.startsWith('.'))){reply(res,403,'Forbidden');return;}
 if(name==='/')name='/index.html';
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){reply(res,403,'Forbidden');return;}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){reply(res,404,'Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD'){res.end();return;}
  const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
 });
});
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${port} is in use. Try: node start-local.cjs ${port+1}`:err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log(`Photo Melon: http://127.0.0.1:${port}/`);console.log('Edit dist/ files, then refresh the browser. Press Ctrl+C to stop.');});
