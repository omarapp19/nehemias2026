import fs from "node:fs";
import path from "node:path";
import { Client } from "ssh2";

const conn = new Client();

conn.on("ready", () => {
  console.log("SSH Client Ready for DB test");
  
  const file = "packages/db/test_upsert.ts";
  const localContent = fs.readFileSync(path.resolve(file), "utf8");
  const base64Content = Buffer.from(localContent).toString("base64");
  
  const cmd = `echo "${base64Content}" | base64 -d > nehemias/${file}`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on("close", () => {
      console.log("Uploaded! Running the test on remote database...");
      conn.exec("cd nehemias/packages/db && pnpm exec dotenv -e ../../.env -- pnpm exec tsx test_upsert.ts", (err, stream) => {
        if (err) throw err;
        stream.on("close", (code) => {
          console.log(`Test exited with code: ${code}`);
          conn.exec("rm nehemias/packages/db/test_upsert.ts", () => {
            conn.end();
          });
        }).on("data", (data) => {
          process.stdout.write(data);
        }).stderr.on("data", (data) => {
          process.stderr.write(data);
        });
      });
    }).on("data", () => {}).stderr.on("data", () => {});
  });
}).connect({
  host: "74.208.112.43",
  port: 22,
  username: "nehemias",
  password: "O$72g*I5Y6!aEV",
  readyTimeout: 20000
});
