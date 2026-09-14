import { fetchProductsPage } from "@/lib/billz/client";

async function main() {
  const resp = await fetchProductsPage(1, 3);
  for (const p of resp.products) {
    console.log("---", p.name);
    console.log("custom_fields:", JSON.stringify(p.custom_fields, null, 2));
  }
}
main().then(() => process.exit(0));
