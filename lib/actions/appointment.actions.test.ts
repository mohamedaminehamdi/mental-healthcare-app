import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRecentAppointmentList } from "./appointment.actions";

const listDocuments = vi.fn();

vi.mock("../appwrite.config", () => ({
  DATABASE_ID: "db",
  APPOINTMENT_COLLECTION_ID: "appointments",
  databases: { listDocuments: (...args: unknown[]) => listDocuments(...args) },
  messaging: {},
}));

const totals: Record<string, number> = {
  scheduled: 140,
  pending: 37,
  cancelled: 9,
};

describe("getRecentAppointmentList", () => {
  beforeEach(() => {
    listDocuments.mockReset();
    listDocuments.mockImplementation(
      async (_db: string, _collection: string, queries: string[]) => {
        const status = queries
          .map((query) => JSON.parse(query))
          .find((query) => query.method === "equal")?.values[0];

        return status
          ? { total: totals[status], documents: [] }
          : { total: 186, documents: [{ $id: "a1" }, { $id: "a2" }] };
      }
    );
  });

  it("counts every appointment per status, not just the first page", async () => {
    const result = await getRecentAppointmentList();

    expect(result).toEqual({
      totalCount: 186,
      scheduledCount: 140,
      pendingCount: 37,
      cancelledCount: 9,
      documents: [{ $id: "a1" }, { $id: "a2" }],
    });
  });

  it("returns undefined when Appwrite is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    listDocuments.mockRejectedValue(new Error("network down"));

    await expect(getRecentAppointmentList()).resolves.toBeUndefined();
  });
});
