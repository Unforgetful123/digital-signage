/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2697203047")

  // update collection data
  unmarshal({
    "name": "alerts"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2697203047")

  // update collection data
  unmarshal({
    "name": "system_state"
  }, collection)

  return app.save(collection)
})
