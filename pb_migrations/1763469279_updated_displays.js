/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "@request.method != \"\"",
    "updateRule": "@request.method != \"\"",
    "viewRule": "@request.method != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
})
