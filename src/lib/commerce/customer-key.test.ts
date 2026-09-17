import { describe, expect, it } from "vitest";
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  isCustomerKey,
  newCustomerKey,
} from "./customer-key";

describe("newCustomerKey", () => {
  it("is long enough not to be guessed", () => {
    expect(newCustomerKey().length).toBeGreaterThanOrEqual(42);
  });

  it("is url safe", () => {
    expect(newCustomerKey()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats", () => {
    const keys = new Set(Array.from({ length: 500 }, newCustomerKey));
    expect(keys.size).toBe(500);
  });
});

describe("isCustomerKey", () => {
  it("accepts a freshly minted key", () => {
    expect(isCustomerKey(newCustomerKey())).toBe(true);
  });

  it("rejects anything that is not a plausible key", () => {
    expect(isCustomerKey("")).toBe(false);
    expect(isCustomerKey("short")).toBe(false);
    expect(isCustomerKey(null)).toBe(false);
    expect(isCustomerKey(12345)).toBe(false);
    expect(isCustomerKey("has spaces and punctuation!!")).toBe(false);
    expect(isCustomerKey("a".repeat(500))).toBe(false);
  });
});

describe("customerCookieOptions", () => {
  it("is named consistently", () => {
    expect(CUSTOMER_COOKIE).toBe("__tmg_customer");
  });

  it("cannot be read by scripts and is secure in production", () => {
    const options = customerCookieOptions(true);
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("drops secure outside production so local http still works", () => {
    expect(customerCookieOptions(false).secure).toBe(false);
  });
});
