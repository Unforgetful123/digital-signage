// One atomic queue record; receivers can read, only signed-in admins can reorder.
migrate((app) => {
  const queues = new Collection({
    type:'base', name:'playback_queues',
    listRule:'', viewRule:'', createRule:null, deleteRule:null,
    updateRule:'@request.auth.collectionName = "admins"',
    fields:[{name:'content_ids',type:'json',maxSize:2000000}],
  });
  app.save(queues);
  const record = new Record(queues);
  record.set('id', 'globalqueue0001');
  record.set('content_ids', []);
  app.save(record);
  const displays = app.findCollectionByNameOrId('displays');
  for (const name of ['current_item_key','next_item_key','next_title','next_type']) {
    displays.fields.add(new Field({name,type:'text',required:false}));
  }
  app.save(displays);
}, (app) => {
  const displays = app.findCollectionByNameOrId('displays');
  for (const name of ['current_item_key','next_item_key','next_title','next_type']) displays.fields.removeByName(name);
  app.save(displays);
  app.delete(app.findCollectionByNameOrId('playback_queues'));
});
