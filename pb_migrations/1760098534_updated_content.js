/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872121667")

  // remove field
  collection.fields.removeById("file2721144851")

  // add field
  collection.fields.addAt(7, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url2721144851",
    "name": "ppt_file",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872121667")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "file2721144851",
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

  // remove field
  collection.fields.removeById("url2721144851")

  return app.save(collection)
})
