/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872121667")

  // remove field
  collection.fields.removeById("text1655102503")

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "number1655102503",
    "max": null,
    "min": null,
    "name": "priority",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872121667")

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1655102503",
    "max": 0,
    "min": 0,
    "name": "priority",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("number1655102503")

  return app.save(collection)
})
