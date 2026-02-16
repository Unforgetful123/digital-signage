/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2697203047")

  // remove field
  collection.fields.removeById("bool556104818")

  // remove field
  collection.fields.removeById("text445393881")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "bool1260321794",
    "name": "active",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2697203047")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "bool556104818",
    "name": "is_emergency",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text445393881",
    "max": 0,
    "min": 0,
    "name": "target_area",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("bool1260321794")

  return app.save(collection)
})
