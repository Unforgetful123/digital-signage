/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "@request.auth.id != \"\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_event_action",
        "maxSelect": 1,
        "name": "action",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "login",
          "alert_trigger",
          "alert_clear",
          "alert_schedule",
          "content_upload",
          "content_bulk",
          "content_delete",
          "birthday_add",
          "birthday_bulk",
          "birthday_delete",
          "display_alert",
          "display_clear_alert",
          "display_refresh",
          "display_restart",
          "display_move",
          "display_remove"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_actor_email",
        "max": 255,
        "min": 0,
        "name": "actor_email",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_actor_id",
        "max": 50,
        "min": 0,
        "name": "actor_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_event_source",
        "maxSelect": 1,
        "name": "source",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "admin_panel",
          "display_monitor"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_event_target",
        "max": 500,
        "min": 0,
        "name": "target",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_event_details",
        "max": 2000,
        "min": 0,
        "name": "details",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_event_logs_01",
    "indexes": [
      "CREATE INDEX `idx_event_logs_created` ON `event_logs` (`created`)",
      "CREATE INDEX `idx_event_logs_action` ON `event_logs` (`action`)"
    ],
    "listRule": "",
    "name": "event_logs",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_event_logs_01");
  return app.delete(collection);
})
