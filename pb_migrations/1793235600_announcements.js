migrate((app)=>{
 const c=app.findCollectionByNameOrId('displays');
 for(const name of ['current_alert_label','current_announcement_mode','current_offer','current_answer','current_live_seen'])c.fields.add(new Field({name,type:'text',required:false}));
 c.fields.add(new Field({name:'current_repeat_minutes',type:'number',min:0,max:1440,required:false}));
 c.fields.add(new Field({name:'current_audio',type:'file',maxSelect:1,maxSize:20971520,mimeTypes:['audio/webm','video/webm','audio/ogg','audio/mp4','audio/wav'],protected:false}));
 return app.save(c);
},(app)=>{const c=app.findCollectionByNameOrId('displays');for(const n of ['current_alert_label','current_announcement_mode','current_offer','current_answer','current_live_seen','current_repeat_minutes','current_audio'])c.fields.removeByName(n);return app.save(c);});
