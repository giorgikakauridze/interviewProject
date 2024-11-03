import Form from "@/app/ui/invoices/edit-form";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { fetchInvoiceById, fetchCustomers } from "@/app/lib/data";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { fetchInvoiceAuditLogs, restoreStatus } from "@/app/lib/actions";

export const metadata: Metadata = {
  title: "Edit Invoice",
};

export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const [invoice, customers, auditLogs] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
    fetchInvoiceAuditLogs(id),
  ]);

  if (!invoice) {
    notFound();
  }
  console.log(auditLogs);
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          {
            label: "Edit Invoice",
            href: `/dashboard/invoices/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form invoice={invoice} customers={customers} />
      <div className="flex mt-10  flex-col gap-10">
        {auditLogs.map((log, i) => {
          const date = new Date(log.change_timestamp);
          const formattedDate = `${date.getUTCDate()}/${
            date.getUTCMonth() + 1
          }/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()} GMT`;

          return (
            <form action={restoreStatus} key={i}>
              <input
                className="hidden"
                name="invoiceId"
                id="invoiceId"
                value={log.invoice_id}
              />
              <input
                className="hidden"
                name="prevState"
                id="prevState"
                value={log.previous_status}
              />
              <div className="flex text-white py-5  justify-around bg-slate-400">
                <span>ChangedBy: {log.changed_by}</span>
                <span>Change time: {formattedDate}</span>
                <span>Prev Status: {log.previous_status}</span>
                <span>New Status: {log.new_status}</span>
                <button className="bg-slate-300  text-black  px-2 ">
                  Restore
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </main>
  );
}
