import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env") });
config();

import { getBalances } from "../apps/api/src/services/transparency.ts";

async function main() {
  const res = await getBalances();
  console.log("CONSOLIDATED BALANCES RESULT:");
  console.log(JSON.stringify(res, null, 2));
}

main()
  .catch(console.error);
