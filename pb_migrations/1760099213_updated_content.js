/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872121667")

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "file2143189854",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "ppt_file",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872121667")

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "file2143189854",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "pdf_file",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
})
