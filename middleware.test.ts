import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ADMIN_SESSION,
  ADMIN_SUBJECT,
  PATIENT_SESSION,
  createSessionToken,
  patientSubject,
} from "./lib/session";
import { middleware } from "./middleware";

const secret = "middleware-test-secret";
let alice = "";
let admin = "";

beforeAll(async () => {
  process.env.SESSION_SECRET = secret;
  alice = await createSessionToken(patientSubject("alice"), secret, 3600);
  admin = await createSessionToken(ADMIN_SUBJECT, secret, 3600);
});

const visit = async (path: string, cookies: Record<string, string> = {}) => {
  const request = new NextRequest(`http://localhost${path}`, {
    headers: {
      cookie: Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    },
  });
  const response = await middleware(request);
  const location = response.headers.get("location");
  return location ? `redirect ${new URL(location).pathname}${new URL(location).search}` : `${response.status}`;
};

describe("patient pages", () => {
  it("let a patient open their own pages", async () => {
    const session = { [PATIENT_SESSION.cookie]: alice };

    expect(await visit("/patients/alice/register", session)).toBe("200");
    expect(await visit("/patients/alice/new-appointment/success", session)).toBe(
      "200"
    );
  });

  it("send visitors without a session back to the start", async () => {
    expect(await visit("/patients/alice/register")).toBe("redirect /");
  });

  it("don't open another patient's pages", async () => {
    expect(
      await visit("/patients/bob/register", { [PATIENT_SESSION.cookie]: alice })
    ).toBe("redirect /");
  });

  it("ignore the old unsigned authToken cookie and admin sessions", async () => {
    expect(await visit("/patients/alice/register", { authToken: "x" })).toBe(
      "redirect /"
    );
    expect(
      await visit("/patients/alice/register", { [PATIENT_SESSION.cookie]: admin })
    ).toBe("redirect /");
  });
});

describe("admin pages", () => {
  it("require a signed admin session", async () => {
    expect(await visit("/admin")).toBe("redirect /?admin=true");
    expect(await visit("/admin", { userRole: "admin" })).toBe(
      "redirect /?admin=true"
    );
    expect(await visit("/admin", { [ADMIN_SESSION.cookie]: alice })).toBe(
      "redirect /?admin=true"
    );
    expect(await visit("/admin", { [ADMIN_SESSION.cookie]: admin })).toBe("200");
  });
});

it("leaves the home page public", async () => {
  expect(await visit("/")).toBe("200");
});
