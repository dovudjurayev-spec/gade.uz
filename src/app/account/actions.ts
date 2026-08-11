"use server";

import { redirect } from "next/navigation";
import { destroyCustomerSession } from "@/lib/customer-auth";

export async function logoutAction() {
  await destroyCustomerSession();
  redirect("/");
}
