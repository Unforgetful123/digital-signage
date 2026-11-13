const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('receiverDesktop',Object.freeze({
  status:message=>ipcRenderer.send('receiver:status',message),
  hide:()=>ipcRenderer.send('receiver:hide'),
  info:()=>ipcRenderer.invoke('receiver:info'),
  startup:enabled=>ipcRenderer.invoke('receiver:startup',enabled),
  onRefresh:callback=>{const listener=()=>callback();ipcRenderer.on('receiver:refresh',listener);return()=>ipcRenderer.removeListener('receiver:refresh',listener);}
}));
