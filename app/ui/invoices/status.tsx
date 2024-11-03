"use client";

import { logInvoiceStatusChange, updateStatus } from "@/app/lib/actions";
import { Invoice } from "@/app/lib/definitions";
import clsx from "clsx";

export default function InvoiceStatus({ invoice }: { invoice: Invoice }) {
  const providedDate = new Date(invoice.date);
  const currentDate = new Date();
  const differenceInTime = +currentDate - +providedDate;
  const differenceInDays = differenceInTime / (1000 * 3600 * 24);
  if (differenceInDays > 14 && invoice.status === "pending")
    invoice.status = "overdue";

  const invoicesStatus = [
    `${invoice.status}`,
    "pending",
    "overdue",
    "paid",
    "cancelled",
  ];
  const uniqueInvoicesStatus = [...new Set(invoicesStatus)];

  const formHandler = async (formData: FormData) => {
    await updateStatus(formData);
    await logInvoiceStatusChange(formData);
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-1 text-xs",
        {
          "bg-gray-100 text-gray-500": invoice.status === "pending",
          "bg-gray-100 text-gray-600": invoice.status === "overdue",
          "bg-green-500 text-white": invoice.status === "paid",
          "bg-red-500 text-white": invoice.status === "cancelled",
        }
      )}
    >
      <form action={formHandler}>
        <input
          className="hidden"
          value={invoice.id}
          name="invoiceId"
          id="invoiceId"
        />
        <input
          className="hidden"
          value={invoice.status}
          name="previousStatus"
          id="previousStatus"
        />

        <select
          name="invoiceStatus"
          id="invoiceStatus"
          className="bg-transparent border-none  focus:ring-0"
          onChange={(e) => e.target.form?.requestSubmit()}
        >
          {uniqueInvoicesStatus.map((status, i) => (
            <option key={i}>{status}</option>
          ))}
        </select>
      </form>
    </span>
  );
}
