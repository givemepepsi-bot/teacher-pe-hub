import {readFile} from 'node:fs/promises';
export const releasePaths=[
 '.gitignore','.firebaserc','.github/workflows/pages.yml',
 'index.html','privacy.html','README.md','SECURITY_REVIEW.md','package.json','package-lock.json',
 'server.mjs','Start.cmd','playwright.config.mjs','firebase.json','firestore.rules','firestore.indexes.json',
 'src/app.js','src/domain.js','src/storage.js','src/styles.css','src/cloud.js','src/cloud-contract.js','src/firebase-config.js',
 'scripts/build.mjs','scripts/verify-public-services.mjs','scripts/release-files.mjs',
 'tests/domain.test.mjs','tests/storage.test.mjs','tests/cloud.test.mjs','tests/publish.test.mjs',
 'tests/browser/app.spec.mjs','tests/browser/privacy.spec.mjs'
];
const entries=[];
for(const file of releasePaths){
 const content=await readFile(new URL('../'+file,import.meta.url),'utf8');
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/.test(content))throw Error(`Credential pattern in ${file}`);
 if(content.includes('givemepepsi'+'@nate.com')||/C:[\\/]Users[\\/]SJ/.test(content))throw Error(`Private local information in ${file}`);
 if(/AIza[A-Za-z0-9_-]{30,}/.test(content)&&file!=='src/firebase-config.js')throw Error(`Unexpected API key in ${file}`);
 entries.push({path:file,mode:'100644',type:'blob',content});
}
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(entries));else console.log(`Security-scanned ${entries.length} allowlisted source files. No private credentials or local account details detected.`);
