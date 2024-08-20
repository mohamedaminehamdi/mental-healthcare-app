import { describe, expect, it } from "vitest";

import {
  getFileConfigForType,
  matchesFileSignature,
  validateFile,
} from "./file-validation";

const identification = getFileConfigForType("identification");
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const makeFile = (bytes: number[], name: string, type: string) =>
  new File([new Uint8Array(bytes)], name, { type });

describe("validateFile (identification)", () => {
  it("accepts a small PNG", () => {
    const file = makeFile(PNG_HEADER, "passport.png", "image/png");

    expect(validateFile(file, identification)).toEqual({ valid: true });
  });

  it("rejects files over 5 MB", () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "id.png", {
      type: "image/png",
    });

    expect(validateFile(file, identification).valid).toBe(false);
  });

  it("rejects types outside the allow-list", () => {
    const file = makeFile([0x3c, 0x68], "id.html", "text/html");

    expect(validateFile(file, identification).valid).toBe(false);
  });
});

describe("matchesFileSignature", () => {
  it("accepts content that matches the declared type", async () => {
    const file = makeFile(PNG_HEADER, "id.png", "image/png");

    expect(await matchesFileSignature(file)).toBe(true);
  });

  it("rejects HTML renamed to .png", async () => {
    const html = [..."<html><script>"].map((char) => char.charCodeAt(0));
    const file = makeFile(html, "id.png", "image/png");

    expect(await matchesFileSignature(file)).toBe(false);
  });

  it("rejects unknown types", async () => {
    const file = makeFile([0x00], "id.bin", "application/octet-stream");

    expect(await matchesFileSignature(file)).toBe(false);
  });
});
