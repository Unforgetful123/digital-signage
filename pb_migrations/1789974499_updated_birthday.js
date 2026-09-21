/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_122154027")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number2254405824",
    "max": null,
    "min": null,
    "name": "duration",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_122154027")

  // remove field
  collection.fields.removeById("number2254405824")

  return app.save(collection)
})
