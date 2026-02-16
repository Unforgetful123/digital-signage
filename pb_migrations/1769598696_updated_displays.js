/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2891697196")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "listRule": "@request.method = \"GET\"",
    "updateRule": "@request.method = \"PATCH\" || @request.method = \"PUT\"",
    "viewRule": "@request.method = \"GET\""
  }, collection)

  return app.save(collection)
})
