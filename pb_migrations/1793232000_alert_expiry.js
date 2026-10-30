migrate((app)=>{
 const c=app.findCollectionByNameOrId('displays');
 c.fields.add(new Field({name:'current_alert_expires',type:'text',required:false}));
 c.fields.add(new Field({name:'current_alert_id',type:'text',required:false}));
 return app.save(c);
},(app)=>{const c=app.findCollectionByNameOrId('displays');c.fields.removeByName('current_alert_expires');c.fields.removeByName('current_alert_id');return app.save(c);});
