// Playback metadata reported by the updated display player.
migrate((app) => {
  const collection = app.findCollectionByNameOrId('displays');
  collection.fields.add(new Field({name:'current_duration',type:'number',min:0,required:false}));
  collection.fields.add(new Field({name:'current_scope',type:'text',required:false}));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('displays');
  collection.fields.removeByName('current_duration');
  collection.fields.removeByName('current_scope');
  return app.save(collection);
});
