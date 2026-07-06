import { describe, it, expect } from "vitest";
import { validateCuit, validateCertPEM, validateKeyPEM } from "@/lib/validators";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("validateCuit", () => {
  // CUITs reales y predecibles
  // 20-12345678-9 → dígito verificador calculado: 9
  // 27-12345678-0 → dígito verificador calculado: 0
  // 30-12345678-5 → dígito verificador calculado: 5
  // 23-12345678-2 → dígito verificador calculado: 2
  // 33-12345678-9 → dígito verificador calculado: 9
  // 34-12345678-1 → dígito verificador calculado: 1

  it("should validate correct CUIT with dashes", () => {
    expect(validateCuit("20-12345678-6")).toBe(true);
    expect(validateCuit("27-12345678-0")).toBe(true);
    expect(validateCuit("30-12345678-1")).toBe(true);
  });

  it("should validate correct CUIT without dashes", () => {
    expect(validateCuit("20123456786")).toBe(true);
    expect(validateCuit("27123456780")).toBe(true);
    expect(validateCuit("30123456781")).toBe(true);
  });

  it("should reject CUITs with invalid check digit", () => {
    expect(validateCuit("20-12345678-0")).toBe(false);
    expect(validateCuit("27-12345678-5")).toBe(false);
    expect(validateCuit("30-12345678-5")).toBe(false);
  });

  it("should reject empty string", () => {
    expect(validateCuit("")).toBe(false);
  });

  it("should reject null or undefined", () => {
    expect(validateCuit(null as any)).toBe(false);
    expect(validateCuit(undefined as any)).toBe(false);
  });

  it("should reject CUITs with wrong length", () => {
    expect(validateCuit("2012345678")).toBe(false);
    expect(validateCuit("201234567890")).toBe(false);
  });

  it("should reject CUITs with invalid prefix", () => {
    // prefijos inválidos: 00, 10, 15, 99
    expect(validateCuit("00-12345678-5")).toBe(false);
    expect(validateCuit("10-12345678-6")).toBe(false);
    expect(validateCuit("99-12345678-5")).toBe(false);
  });

  it("should handle mixed formatting", () => {
    // espacios, guiones mezclados
    expect(validateCuit(" 20-12345678-6 ")).toBe(true);
  });

  it("should reject non-numeric characters", () => {
    expect(validateCuit("20-ABCD5678-9")).toBe(false);
  });

  it("should reject CUITs with all zeros", () => {
    expect(validateCuit("00-00000000-0")).toBe(false);
    expect(validateCuit("00000000000")).toBe(false);
  });

  it("should validate prefix 23 correctly", () => {
    expect(validateCuit("23-12345678-5")).toBe(true);
  });

  it("should validate prefix 33 correctly", () => {
    expect(validateCuit("33-12345678-0")).toBe(true);
  });

  it("should validate prefix 34 correctly", () => {
    expect(validateCuit("34-12345678-7")).toBe(true);
  });

  it("should validate prefix 24 correctly", () => {
    expect(validateCuit("24-12345678-1")).toBe(true);
  });
});

describe("validateCertPEM", () => {
  it("should accept valid PEM certificate", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END CERTIFICATE-----";
    expect(validateCertPEM(pem)).toBe(true);
  });

  it("should accept empty string (optional field)", () => {
    expect(validateCertPEM("")).toBe(true);
  });

  it("should reject non-PEM content", () => {
    expect(validateCertPEM("not-a-certificate")).toBe(false);
  });

  it("should reject RSA key passed as certificate", () => {
    const rsaKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----";
    expect(validateCertPEM(rsaKey)).toBe(false);
  });

  it("should reject private key passed as certificate", () => {
    const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----";
    expect(validateCertPEM(privateKey)).toBe(false);
  });

  it("should accept certificate with extra whitespace", () => {
    const pem = "  -----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...  ";
    expect(validateCertPEM(pem)).toBe(true);
  });

  it("should reject null or undefined", () => {
    expect(validateCertPEM(null as any)).toBe(false);
    expect(validateCertPEM(undefined as any)).toBe(false);
  });

  it("should reject numeric input", () => {
    expect(validateCertPEM(123 as any)).toBe(false);
  });
});

describe("validateKeyPEM", () => {
  it("should accept valid PKCS#8 private key", () => {
    const key = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----";
    expect(validateKeyPEM(key)).toBe(true);
  });

  it("should accept valid RSA private key", () => {
    const rsaKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----";
    expect(validateKeyPEM(rsaKey)).toBe(true);
  });

  it("should accept empty string (optional field)", () => {
    expect(validateKeyPEM("")).toBe(true);
  });

  it("should reject non-PEM content", () => {
    expect(validateKeyPEM("not-a-key")).toBe(false);
  });

  it("should reject certificate passed as key", () => {
    const cert = "-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END CERTIFICATE-----";
    expect(validateKeyPEM(cert)).toBe(false);
  });

  it("should accept private key with extra whitespace", () => {
    const key = "  -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...  ";
    expect(validateKeyPEM(key)).toBe(true);
  });

  it("should reject null or undefined", () => {
    expect(validateKeyPEM(null as any)).toBe(false);
    expect(validateKeyPEM(undefined as any)).toBe(false);
  });

  it("should reject numeric input", () => {
    expect(validateKeyPEM(456 as any)).toBe(false);
  });
});
