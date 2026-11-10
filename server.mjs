import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url)),port=Number(process.env.PORT||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const securityPolicy=(await readFile(path.join(root,'index.html'),'utf8')).match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1]||"default-src 'self'; object-src 'none'";
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');let pathname=decodeURIComponent(url.pathname);
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 // Only the application entry and its source assets are served; no workspace documents or Git files.
 if(pathname==='/'||pathname.startsWith('/sports'))pathname='/index.html';
 if(!['/index.html','/privacy.html'].includes(pathname)&&!/^\/src\/[a-zA-Z0-9_.-]+\.(js|css)$/.test(pathname)){res.writeHead(404);res.end('Not found');return;}
 const target=path.join(root,pathname);await stat(target);const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':securityPolicy+"; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`포트 ${port}가 사용 중입니다. 기존 앱을 열거나 PORT 환경변수를 변경해 주세요.`:e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`체육쌤 허브 실행 중: http://127.0.0.1:${port}\n종료: Ctrl+C`));
