import fs from "fs";

const apiPath = "app/api/brief-extract/route.ts";
let apiContent = fs.readFileSync(apiPath, "utf-8");

apiContent = apiContent.replace(
  "if (!parserResult.ok) {",
  "if (!parserResult.ok) { console.error('=== PARSER GATEWAY FALSE ===', parserResult);"
);

fs.writeFileSync(apiPath, apiContent);
