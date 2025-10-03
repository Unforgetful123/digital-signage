import PocketBase from "pocketbase";
import fs from "fs";
import csv from "csv-parser";

const pb = new PocketBase("http://127.0.0.1:8090");

(async () => {
  try {
    // ✅ Admin auth
    await pb.admins.authWithPassword("johnmantraj@gmail.com", "Green@1234");
    console.log("✅ Connected to PocketBase as admin");

    // ✅ Read CSV and insert rows
    fs.createReadStream("C:/Users/johnm/Downloads/birthdays_rows.csv")
      .pipe(csv())
      .on("data", async (row) => {
        try {
          await pb.collection("birthday").create({
            name: row.name,
            designation: row.designation,
            dob: row.dob,
            photo_url: row.photo_url || null,
            video_url: row.video_url || null,
          });
          console.log("Inserted:", row.name);
        } catch (err) {
          console.error("❌ Error inserting row:", row, err.response || err);
        }
      })
      .on("end", () => {
        console.log("🎉 Migration completed");
      });

  } catch (err) {
    console.error("❌ Admin login failed:", err.response || err);
  }
})();
