import { describe, expect, it } from "vitest";

import { formatDateTime } from "./utils";

describe("formatDateTime", () => {
  it("formats in the requested time zone", () => {
    const date = "2024-03-05T14:30:00Z";

    expect(formatDateTime(date, "UTC").dateTime).toBe("Mar 5, 2024, 2:30 PM");
    expect(formatDateTime(date, "Africa/Tunis").timeOnly).toBe("3:30 PM");
    expect(formatDateTime(date, "America/New_York").dateOnly).toBe(
      "Mar 5, 2024"
    );
  });
});
