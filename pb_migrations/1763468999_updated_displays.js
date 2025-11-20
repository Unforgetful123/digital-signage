/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "",
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "@request.method = \"POST\"",
    "listRule": "@request.method = \"GET\"",
    "updateRule": "@request.method = \"PATCH\" || @request.method = \"PUT\"",
    "viewRule": "@request.method = \"GET\""
  }, collection)

  return app.save(collection)
})
