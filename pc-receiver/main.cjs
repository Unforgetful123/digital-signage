const {app,BrowserWindow,Tray,Menu,ipcMain,screen,powerMonitor,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {nextWindowState}=require('./window-state.cjs');
app.setName('VRL PC Receiver');
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
let win,tray,quitting=false,windowState=null,preferences={},crashes=0;
const prefPath=path.join(app.getPath('userData'),'receiver-preferences.json');
try{preferences=JSON.parse(fs.readFileSync(prefPath,'utf8'));}catch{}
const ui=path.join(app.isPackaged?path.join(process.resourcesPath,'receiver-ui'):path.join(__dirname,'../display-window/dist'),'receiver.html');
const uiURL=pathToFileURL(ui).href;
const trusted=event=>!!win && event.sender===win.webContents && event.senderFrame===win.webContents.mainFrame && event.senderFrame.url===uiURL;
function savePreferences(){fs.mkdirSync(path.dirname(prefPath),{recursive:true});fs.writeFileSync(prefPath,JSON.stringify(preferences));}
function setStartup(enabled){
  if(process.platform==='win32' && app.isPackaged)app.setLoginItemSettings({openAtLogin:enabled,path:process.execPath,args:['--background']});
  preferences.startup=enabled;savePreferences();updateTray();
  return {enabled,supported:process.platform==='win32'&&app.isPackaged};
}
function normalWindow(){win.setAlwaysOnTop(false);win.setSkipTaskbar(false);win.setBounds({width:720,height:640});win.center();}
function showWindow(){if(!win)return;if(win.isMinimized())win.restore();if(windowState?.state!=='alert')normalWindow();win.show();win.focus();}
function showAlert(mode){
  const {workArea}=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width=mode?Math.min(680,workArea.width):Math.round(workArea.width*.9);
  const height=mode?Math.min(440,workArea.height):Math.round(workArea.height*.85);
  win.setBounds({x:workArea.x+Math.round((workArea.width-width)/2),y:workArea.y+Math.round((workArea.height-height)/2),width,height});
  win.setSkipTaskbar(false);win.setAlwaysOnTop(true);if(win.isMinimized())win.restore();win.show();win.focus();
}
function hide(){win?.hide();win?.setSkipTaskbar(true);}
function updateTray(){
  if(!tray)return;
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:windowState?.state==='alert'?'Show active broadcast':'Open receiver',click:showWindow},
    {label:'Check connection now',click:()=>win?.webContents.send('receiver:refresh')},
    {label:'Start with Windows',type:'checkbox',checked:!!preferences.startup,enabled:process.platform==='win32'&&app.isPackaged,click:item=>{try{setStartup(item.checked);}catch(e){dialog.showErrorBox('Startup setting',e.message);}}},
    {type:'separator'},
    {label:'Quit receiver',click:()=>{quitting=true;app.quit();}}
  ]));
}
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',showWindow);
 app.whenReady().then(()=>{
  if(!fs.existsSync(ui)){dialog.showErrorBox('Build required','Run npm run build:ui from the pc-receiver folder first.');app.quit();return;}
  win=new BrowserWindow({width:720,height:640,show:false,autoHideMenuBar:true,title:'VRL PC Receiver',backgroundColor:'#eef3f6',
   webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required',partition:'persist:vrl-pc-receiver'}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(e,url)=>{if(url!==uiURL)e.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.webContents.session.setPermissionCheckHandler(()=>false);
  win.on('close',event=>{if(!quitting){event.preventDefault();hide();}});
  win.webContents.on('render-process-gone',()=>{if(!quitting){windowState=null;setTimeout(()=>{if(!quitting&&!win.isDestroyed())win.reload();},Math.min(30000,1000*++crashes));}});
  win.webContents.on('did-fail-load',(_e,code,description)=>{if(code!==-3){dialog.showErrorBox('Receiver could not load',description);quitting=true;app.quit();}});
  tray=new Tray(path.join(__dirname,'icon.ico'));
  tray.setToolTip('VRL PC Receiver — connecting');tray.on('double-click',showWindow);updateTray();
  ipcMain.on('receiver:status',(event,message)=>{
    if(!trusted(event))return;
    const transition=nextWindowState(windowState,message);if(!transition)return;
    windowState=transition.next;
    if(message.state==='idle'||message.state==='alert'){
      if(preferences.startup===undefined){try{setStartup(true);}catch{preferences.startup=false;}}
    }
    if(transition.action==='setup'){normalWindow();win.show();}
    if(transition.action==='alert')showAlert(windowState.mode);
    if(transition.action==='hide')hide();
    const status=typeof message.connection==='string'?message.connection.slice(0,100):message.state;
    tray.setToolTip(`VRL PC Receiver — ${status}`);updateTray();
  });
  ipcMain.on('receiver:hide',event=>{if(trusted(event))hide();});
  ipcMain.handle('receiver:info',event=>{if(!trusted(event))throw Error('Untrusted sender');return {hostname:os.hostname(),startup:!!preferences.startup,startupSupported:process.platform==='win32'&&app.isPackaged,version:app.getVersion()};});
  ipcMain.handle('receiver:startup',(event,enabled)=>{if(!trusted(event)||typeof enabled!=='boolean')throw Error('Invalid request');return setStartup(enabled);});
  powerMonitor.on('resume',()=>win?.webContents.send('receiver:refresh'));
  powerMonitor.on('unlock-screen',()=>win?.webContents.send('receiver:refresh'));
  win.loadFile(ui);
 });
}
app.on('before-quit',()=>{quitting=true;});
app.on('window-all-closed',()=>{/* Tray keeps the receiver alive. */});
app.on('will-quit',()=>tray?.destroy());
