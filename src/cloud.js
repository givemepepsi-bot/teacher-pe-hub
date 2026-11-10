import {firebaseConfig} from './firebase-config.js';
import {workspacePath,encodeWorkspace,decodeWorkspace,verifyCloudVersion} from './cloud-contract.js';
import {empty} from './domain.js';
export const cloudConfigured=!!firebaseConfig?.projectId;
let modules,auth,db,initializing;
async function initialize(){
 if(!cloudConfigured)throw Error('Firebase 연결이 아직 배포되지 않았습니다. 현재는 로컬 체험을 사용할 수 있습니다.');
 if(!initializing)initializing=(async()=>{
  const [app,a,f]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js')]);
  modules={a,f};const instance=app.initializeApp(firebaseConfig);auth=a.getAuth(instance);await a.setPersistence(auth,a.browserSessionPersistence);db=f.initializeFirestore(instance,{localCache:f.memoryLocalCache()});await auth.authStateReady();return auth;
 })();return initializing;
}
export async function observeIdentity(callback){if(!cloudConfigured){callback(null);return ()=>{};}await initialize();return modules.a.onAuthStateChanged(auth,u=>callback(u?{uid:u.uid}:null));}
export async function loginGoogle(){await initialize();const provider=new modules.a.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await modules.a.signInWithPopup(auth,provider);}
export async function logoutGoogle(){await initialize();await modules.a.signOut(auth);}
function identity(uid){if(!auth?.currentUser||auth.currentUser.uid!==uid)throw Error('로그인 계정을 다시 확인해 주세요.');return modules.f.doc(db,workspacePath(uid));}
export async function readCloud(uid){await initialize();const snap=await modules.f.getDocFromServer(identity(uid));return snap.exists()?decodeWorkspace(snap.data(),uid):{data:empty(),revision:0,generation:null};}
export async function writeCloud(data,expectedRevision,uid,expectedGeneration){
 await initialize();const ref=identity(uid),{payload}=encodeWorkspace(data),{f}=modules;
 return f.runTransaction(db,async tx=>{if(auth.currentUser?.uid!==uid)throw Error('로그인이 변경되어 저장하지 않았습니다.');const snap=await tx.get(ref);const current=snap.exists()?snap.data():null;verifyCloudVersion(current,expectedRevision,expectedGeneration);
  const revision=expectedRevision+1,generation=current?.generation??crypto.randomUUID();tx.set(ref,{ownerId:uid,schemaVersion:1,revision,generation,payload,createdAt:current?.createdAt??f.serverTimestamp(),updatedAt:f.serverTimestamp()});return decodeWorkspace({ownerId:uid,revision,generation,payload},uid);
 });
}
export async function deleteCloud(uid){await initialize();await modules.f.deleteDoc(identity(uid));}
export function cloudError(error){const code=error?.code??'';if(code==='auth/popup-closed-by-user')return '구글 로그인이 취소되었습니다.';if(code==='auth/popup-blocked')return '로그인 팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.';if(code==='auth/unauthorized-domain')return '현재 사이트의 구글 로그인이 아직 승인 도메인에 등록되지 않았습니다.';if(code==='permission-denied')return '클라우드 접근이 거절되었습니다. 로그인과 서버 보안 규칙 배포 상태를 확인해 주세요.';if(code==='unavailable')return '클라우드에 연결하지 못했습니다. 입력을 유지하고 다시 시도해 주세요.';return error?.message??'클라우드 요청을 완료하지 못했습니다.';}
