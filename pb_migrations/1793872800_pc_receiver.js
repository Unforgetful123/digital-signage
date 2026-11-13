migrate((app)=>{
 const c=app.findCollectionByNameOrId('displays');
 c.fields.add(new Field({name:'device_role',type:'select',values:['display','pc_receiver'],maxSelect:1,required:false}));
 return app.save(c);
},(app)=>{const c=app.findCollectionByNameOrId('displays');c.fields.removeByName('device_role');return app.save(c);});
