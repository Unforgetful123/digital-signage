/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "@request.method = \"POST\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "@request.method = \"GET\""
  }, collection)

  return app.save(collection)
})
