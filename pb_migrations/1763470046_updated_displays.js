/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "@request.method = \"POST\"",
    "deleteRule": "@request.method = \"DELETE\"",
    "listRule": "@request.method = \"GET\"",
    "updateRule": "@request.method = \"PATCH\" || @request.method = \"PUT\"",
    "viewRule": "@request.method = \"GET\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "@request.method != \"\"",
    "deleteRule": "@request.method != \"\"",
    "listRule": "@request.method != \"\"",
    "updateRule": "@request.method != \"\"",
    "viewRule": "@request.method != \"\""
  }, collection)

  return app.save(collection)
})
