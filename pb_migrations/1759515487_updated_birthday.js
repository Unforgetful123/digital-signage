/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_122154027")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file2077391994",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "photo",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "file250577066",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "video",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_122154027")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file2077391994",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "photo_url",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "file250577066",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "video_url",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
})
