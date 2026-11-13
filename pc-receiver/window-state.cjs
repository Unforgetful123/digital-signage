// Pure native-window decisions; an ordinary heartbeat must not reopen a dismissed popup.
function nextWindowState(previous, message) {
  if (!message || !['setup','idle','alert','removed'].includes(message.state)) return null;
  if (message.state==='alert' && (typeof message.id!=='string' || !message.id || message.id.length>10000 || !['','record','live'].includes(message.mode))) return null;
  const next={state:message.state,id:message.state==='alert'?message.id:'',mode:message.mode||''};
  let action='none';
  if(next.state==='setup'||next.state==='removed')action=previous?.state===next.state?'none':'setup';
  else if(next.state==='alert')action=previous?.state!=='alert'||previous.id!==next.id||previous.mode!==next.mode?'alert':'none';
  else if(!previous || previous.state==='alert' || previous.state==='setup')action='hide';
  return {next,action};
}
module.exports={nextWindowState};
