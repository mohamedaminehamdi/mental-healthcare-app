import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StatCard } from "@/components/StatCard";
import { columns } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import { signOutAdmin } from "@/lib/actions/admin.actions";
import { getRecentAppointmentList } from "@/lib/actions/appointment.actions";
import { hasAdminSession } from "@/lib/auth";

// Always render on request: the dashboard shows live data and must not be
// prerendered (and frozen) at build time.
export const dynamic = "force-dynamic";

const AdminPage = async () => {
  // Middleware already checks this; verify again so the page is safe on its own
  if (!(await hasAdminSession())) redirect("/?admin=true");

  const appointments = await getRecentAppointmentList();

  return (
    <div className="mx-auto flex max-w-7xl flex-col space-y-14">
      <header className="admin-header">
        <Link href="/" className="cursor-pointer">
          <Image
            src="/assets/icons/logo-full.svg"
            height={32}
            width={162}
            alt="logo"
            className="h-8 w-fit"
          />
        </Link>

        <div className="flex items-center gap-6">
          <p className="text-16-semibold">Admin Dashboard</p>
          <form action={signOutAdmin}>
            <button
              type="submit"
              className="text-14-regular text-dark-700 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="admin-main">
        <section className="w-full space-y-4">
          <h1 className="header">Welcome 👋</h1>
          <p className="text-dark-700">
            Start the day with managing new appointments
          </p>
        </section>

        {!appointments && (
          <p className="shad-error text-14-regular" role="alert">
            Appointments couldn&apos;t be loaded. Check the Appwrite connection
            and refresh the page.
          </p>
        )}

        <section className="admin-stat">
          <StatCard
            type="appointments"
            count={appointments?.scheduledCount ?? 0}
            label="Scheduled appointments"
            icon={"/assets/icons/appointments.svg"}
          />
          <StatCard
            type="pending"
            count={appointments?.pendingCount ?? 0}
            label="Pending appointments"
            icon={"/assets/icons/pending.svg"}
          />
          <StatCard
            type="cancelled"
            count={appointments?.cancelledCount ?? 0}
            label="Cancelled appointments"
            icon={"/assets/icons/cancelled.svg"}
          />
        </section>

        <DataTable columns={columns} data={appointments?.documents ?? []} />
      </main>
    </div>
  );
};

export default AdminPage;
