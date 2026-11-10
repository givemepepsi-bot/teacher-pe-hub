import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.resolve(process.argv[2]||path.join(root,'dist'));
await mkdir(path.join(out,'src'),{recursive:true});
const files=['index.html','privacy.html','src/app.js','src/styles.css','src/domain.js','src/storage.js','src/cloud.js','src/cloud-contract.js','src/firebase-config.js'];
// Explicit allowlist. Never publish the workspace directory or any browser data.
for(const file of files)await copyFile(path.join(root,file),path.join(out,file));
await writeFile(path.join(out,'.nojekyll'),'');
const html=await readFile(path.join(out,'index.html'),'utf8');
if(/(?:src|href)="\/src\//.test(html))throw Error('Pages 하위 경로에서 동작하지 않는 자원 URL입니다.');
console.log('Public application built from an explicit file allowlist.');
