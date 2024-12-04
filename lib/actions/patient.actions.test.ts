import { beforeEach, describe, expect, it, vi } from "vitest";

import { signInPatient, verifyPatientCode } from "./patient.actions";

const appwrite = vi.hoisted(() => ({
  users: {
    create: vi.fn(),
    list: vi.fn(),
    deleteSession: vi.fn(),
  },
  account: {
    createEmailToken: vi.fn(),
    createSession: vi.fn(),
  },
}));
const startPatientSession = vi.hoisted(() => vi.fn());

vi.mock("../appwrite.config", () => ({ ...appwrite, databases: {}, storage: {} }));
vi.mock("../auth", () => ({ startPatientSession }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));

const conflict = () => Object.assign(new Error("exists"), { code: 409 });
const jane = { name: "Jane Doe", email: "jane@example.com", phone: "+14155552671" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("signInPatient", () => {
  it("signs a new patient in straight away", async () => {
    appwrite.users.create.mockResolvedValue({ $id: "new-user" });

    expect(await signInPatient(jane)).toEqual({
      status: "signed-in",
      userId: "new-user",
    });
    expect(startPatientSession).toHaveBeenCalledWith("new-user");
  });

  it("asks an existing patient for an emailed code instead of signing in", async () => {
    appwrite.users.create.mockRejectedValue(conflict());
    appwrite.users.list.mockResolvedValue({ users: [{ $id: "existing-1" }] });

    expect(await signInPatient(jane)).toEqual({
      status: "verify",
      userId: "existing-1",
    });
    expect(appwrite.account.createEmailToken).toHaveBeenCalledWith(
      "existing-1",
      "jane@example.com"
    );
    expect(startPatientSession).not.toHaveBeenCalled();
  });

  it("refuses a phone number registered under another email", async () => {
    appwrite.users.create.mockRejectedValue(conflict());
    appwrite.users.list.mockResolvedValue({ users: [] });

    const result = await signInPatient(jane);

    expect(result.status).toBe("error");
    expect(appwrite.account.createEmailToken).not.toHaveBeenCalled();
  });

  it("limits how many codes one account can be sent", async () => {
    appwrite.users.create.mockRejectedValue(conflict());
    appwrite.users.list.mockResolvedValue({ users: [{ $id: "existing-2" }] });

    const results = [];
    for (let i = 0; i < 4; i++) results.push((await signInPatient(jane)).status);

    expect(results).toEqual(["verify", "verify", "verify", "error"]);
    expect(appwrite.account.createEmailToken).toHaveBeenCalledTimes(3);
  });
});

describe("verifyPatientCode", () => {
  it("starts a session when Appwrite accepts the code", async () => {
    appwrite.account.createSession.mockResolvedValue({ $id: "appwrite-session" });

    expect(await verifyPatientCode("user-ok", "123456")).toEqual({ ok: true });
    expect(appwrite.users.deleteSession).toHaveBeenCalledWith(
      "user-ok",
      "appwrite-session"
    );
    expect(startPatientSession).toHaveBeenCalledWith("user-ok");
  });

  it("rejects a wrong code without starting a session", async () => {
    appwrite.account.createSession.mockRejectedValue(new Error("invalid token"));

    const result = await verifyPatientCode("user-bad", "000000");

    expect(result.ok).toBe(false);
    expect(startPatientSession).not.toHaveBeenCalled();
  });

  it("stops guessing after five attempts", async () => {
    appwrite.account.createSession.mockRejectedValue(new Error("invalid token"));

    for (let i = 0; i < 5; i++) await verifyPatientCode("user-guess", "000000");
    const sixth = await verifyPatientCode("user-guess", "123456");

    expect(sixth).toEqual({
      ok: false,
      error: "Too many attempts. Please request a new code later.",
    });
    expect(appwrite.account.createSession).toHaveBeenCalledTimes(5);
  });
});
