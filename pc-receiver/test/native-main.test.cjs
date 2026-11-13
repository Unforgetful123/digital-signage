const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const {EventEmitter}=require('node:events');
const {nextWindowState}=require('../window-state.cjs');
async function harness(){
 let win,ipc=new EventEmitter(),tray;const login=[];const saved=[];
 class BrowserWindow extends EventEmitter{
  constructor(options){super();this.options=options;this.visible=false;this.shows=0;win=this;this.webContents=new EventEmitter();this.webContents.mainFrame={url:''};this.webContents.setWindowOpenHandler=h=>this.openHandler=h;this.webContents.session={setPermissionRequestHandler(){},setPermissionCheckHandler(){}};this.webContents.send=()=>{};}
  loadFile(file){this.webContents.mainFrame.url=require('node:url').pathToFileURL(file).href;}setBounds(b){this.bounds=b;}center(){}setSkipTaskbar(v){this.skipped=v;}setAlwaysOnTop(v){this.top=v;}show(){this.visible=true;this.shows++;}hide(){this.visible=false;}focus(){}isMinimized(){return false;}isDestroyed(){return false;}
 }
 class Tray{constructor(){tray=this;}setContextMenu(m){this.menu=m;}setToolTip(t){this.tooltip=t;}on(){}destroy(){}}
 const app=new EventEmitter();Object.assign(app,{setName(){},commandLine:{appendSwitch(){}},getPath:()=>'/fake/data',getVersion:()=> '1.0.0',isPackaged:true,requestSingleInstanceLock:()=>true,whenReady:()=>Promise.resolve(),setLoginItemSettings:v=>login.push(v),quit(){this.emit('before-quit');},});
 ipc.handle=(name,fn)=>ipc.on(name,fn);
 const fakeFs={readFileSync(){throw Error('First launch')},existsSync:()=>true,mkdirSync(){},writeFileSync:(...v)=>saved.push(v)};
 const fakeElectron={app,BrowserWindow,Tray,Menu:{buildFromTemplate:m=>m},ipcMain:ipc,screen:{getDisplayNearestPoint:()=>({workArea:{x:0,y:0,width:1920,height:1080}}),getCursorScreenPoint:()=>({x:0,y:0})},powerMonitor:new EventEmitter(),dialog:{showErrorBox(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../main.cjs'),'utf8'),{require:n=>n==='electron'?fakeElectron:n==='node:fs'?fakeFs:n==='./window-state.cjs'?{nextWindowState}:require(n),__dirname:path.resolve(__dirname,'..'),process:{platform:'win32',resourcesPath:'/resources',execPath:'C:\\VRL\\receiver.exe'},setTimeout,console});
 await new Promise(r=>setImmediate(r));
 const send=message=>ipc.emit('receiver:status',{sender:win.webContents,senderFrame:win.webContents.mainFrame},message);
 return {win,send,app,tray,ipc,login,saved};
}
test('native receiver configures sandbox, tray, login, one popup and clear',async()=>{
 const h=await harness();assert.equal(h.win.options.webPreferences.nodeIntegration,false);assert.equal(h.win.options.webPreferences.contextIsolation,true);assert.equal(h.win.options.webPreferences.backgroundThrottling,false);
 h.send({state:'setup'});assert.equal(h.win.visible,true);
 h.send({state:'idle',connection:'Connected'});assert.equal(h.win.visible,false);assert.equal(h.login[0].openAtLogin,true);
 h.send({state:'alert',id:'fire1',mode:''});assert.equal(h.win.visible,true);assert.equal(h.win.top,true);assert.equal(h.win.bounds.width,1728);
 const count=h.win.shows;h.send({state:'alert',id:'fire1',mode:''});assert.equal(h.win.shows,count);
 let prevented=false;h.win.emit('close',{preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(h.win.visible,false);
 h.send({state:'alert',id:'live2',mode:'live'});assert.equal(h.win.visible,true);assert.equal(h.win.bounds.width,680);
 h.send({state:'idle'});assert.equal(h.win.visible,false);
 assert.equal(h.win.openHandler({url:'https://example.org'}).action,'deny');
});
test('untrusted frames cannot show a native window or change startup',async()=>{
 const h=await harness();h.ipc.emit('receiver:status',{sender:{},senderFrame:{}},{state:'alert',id:'x',mode:''});assert.equal(h.win.visible,false);
 const event={sender:h.win.webContents,senderFrame:{url:h.win.webContents.mainFrame.url}};h.ipc.emit('receiver:status',event,{state:'setup'});assert.equal(h.win.visible,false);
 assert.throws(()=>h.ipc.emit('receiver:startup',event,true),/Invalid request/);
});
