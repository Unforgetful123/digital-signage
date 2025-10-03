import PocketBase from "pocketbase";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const pb = new PocketBase("http://127.0.0.1:8090");

(async () => {
  try {
    const version = require("./node_modules/pocketbase/package.json").version;
    console.log("PocketBase JS SDK version:", version);

    // Try admin login
    console.log("➡️ Trying pb.admins.authWithPassword()");
    await pb.admins.authWithPassword("johnmantraj@gmail.com", "Green@1234");
    console.log("✅ Admin login success!");
  } catch (err) {
    console.error("❌ Admin login failed");
    console.error(err);
  }

  try {
    // Try superusers collection
    console.log("➡️ Trying pb.collection('_superusers').authWithPassword()");
    await pb.collection("_superusers").authWithPassword("johnmantraj@gmail.com", "Green@1234");
    console.log("✅ _superusers login success!");
  } catch (err) {
    console.error("❌ _superusers login failed");
    console.error(err);
  }
})();
