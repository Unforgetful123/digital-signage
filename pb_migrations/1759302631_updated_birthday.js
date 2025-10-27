/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_122154027")

  // remove field
  collection.fields.removeById("url2077391994")

  // remove field
  collection.fields.removeById("url250577066")

  // add field
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

  // add field
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
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_122154027")

  // add field
  collection.fields.addAt(4, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url2077391994",
    "name": "photo_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url250577066",
    "name": "video_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // remove field
  collection.fields.removeById("file2077391994")

  // remove field
  collection.fields.removeById("file250577066")

  return app.save(collection)
})
