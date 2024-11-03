"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.log(error);

    // If a database error occurs, return a more specific error.
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Invoice.",
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.log(error);

    return { message: "Database Error: Failed to Update Invoice." };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');

  try {
    await sql`UPDATE invoices SET status = 'cancelled' WHERE id = ${id}`;
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice" };
  } catch (error) {
    console.log(error);

    return { message: "Database Error: Failed to Delete Invoice." };
  }
}

export async function logInvoiceStatusChange(formData: FormData) {
  const invoiceId = formData.get("invoiceId") as string;
  const newStatus = formData.get("invoiceStatus") as string;
  const previousStatus = formData.get("previousStatus") as string;

  const session = await auth();
  const changedBy = session?.user?.email;

  try {
    await sql`
    INSERT INTO audit_logs (invoice_id, previous_status, new_status, changed_by)
    VALUES (${invoiceId}, ${previousStatus}, ${newStatus}, ${changedBy})
    `;
  } catch (error) {
    console.log(error);
  }
}

export async function fetchInvoiceAuditLogs(invoiceId: string) {
  const auditLogs = await sql`
    SELECT *
    FROM audit_logs
    WHERE invoice_id = ${invoiceId}
    ORDER BY change_timestamp DESC
  `;

  return auditLogs.rows;
}

export async function updateStatus(formData: FormData) {
  const invoiceId = formData.get("invoiceId") as string;
  const invoiceStatus = formData.get("invoiceStatus") as string;

  try {
    await sql`UPDATE invoices SET status = ${invoiceStatus} WHERE id = ${invoiceId}`;

    revalidatePath("/dashboard/invoices");

    return { message: "Deleted Invoice" };
  } catch (error) {
    console.log(error);

    return { message: "Database Error: Failed to Delete Invoice." };
  }
}

export async function restoreStatus(formData: FormData) {
  const invoiceId = formData.get("invoiceId") as string;
  const prevState = formData.get("prevState") as string;

  try {
    await sql`UPDATE invoices SET status = ${prevState} WHERE id = ${invoiceId}`;

    revalidatePath("/dashboard/invoices");

    return { message: "Deleted Invoice" };
  } catch (error) {
    console.log(error);
    return { message: "Database Error: Failed to Delete Invoice." };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function setFilteredCookie(formData: FormData) {
  const filter = formData.get("filter") as string;
  console.log(filter, "rame");
  cookies().set("filter", filter, {
    path: "/", // Set the path for the cookie
    httpOnly: true, // Make the cookie HTTP-only
    secure: true, // Ensure the cookie is secure (HTTPS only)
    maxAge: 60 * 60 * 24 * 7, // Optional: Set max age for 7 days
  });
}
