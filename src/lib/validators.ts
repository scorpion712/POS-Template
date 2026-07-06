/**
 * Validadores específicos para ARCA (AFIP).
 *
 * validateCuit():
 *   Algoritmo módulo 11 usado por AFIP para validar CUIT/CUIL.
 *   Fuente: RG AFIP 3928
 *
 *   Formato aceptado: XX-XXXXXXXX-X o XXXXXXXXXXX (11 dígitos)
 *   Ej: 20-12345678-9
 *
 * validateCertPEM():
 *   Valida que el certificado comience con -----BEGIN CERTIFICATE-----
 *   Es un check básico de formato, NO valida el contenido criptográfico.
 *
 * validateKeyPEM():
 *   Valida que la clave privada comience con -----BEGIN PRIVATE KEY-----
 *   o -----BEGIN RSA PRIVATE KEY-----
 */

/**
 * Valida un CUIT/CUIL argentino usando el algoritmo módulo 11.
 *
 * @param cuit - CUIT en formato XX-XXXXXXXX-X o XXXXXXXXXXX
 * @returns true si el CUIT es válido
 */
export function validateCuit(cuit: string): boolean {
  if (!cuit) return false;

  // Limpiar guiones, espacios y otros caracteres no numéricos
  const cleaned = cuit.replace(/[^\d]/g, "");

  // Debe tener exactamente 11 dígitos
  if (cleaned.length !== 11) return false;

  // Los primeros 2 dígitos deben ser válidos (20, 23, 24, 27, 30, 33, 34)
  const prefix = parseInt(cleaned.substring(0, 2), 10);
  const validPrefixes = [20, 23, 24, 27, 30, 33, 34];
  if (!validPrefixes.includes(prefix)) return false;

  // Algoritmo módulo 11
  const digits = cleaned.split("").map(Number);
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * multipliers[i];
  }

  const remainder = sum % 11;
  const expectedDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

  return digits[10] === expectedDigit;
}

/**
 * Valida que un certificado tenga formato PEM válido.
 *
 * @param cert - Contenido del certificado (opcional)
 * @returns true si está vacío (opcional) o tiene formato PEM válido
 */
export function validateCertPEM(cert: string): boolean {
  if (typeof cert !== "string") return false;
  if (cert.length === 0) return true; // opcional
  return cert.trim().startsWith("-----BEGIN CERTIFICATE-----");
}

/**
 * Valida que una clave privada tenga formato PEM válido.
 *
 * @param key - Contenido de la clave privada (opcional)
 * @returns true si está vacío (opcional) o tiene formato PEM válido
 */
export function validateKeyPEM(key: string): boolean {
  if (typeof key !== "string") return false;
  if (key.length === 0) return true; // opcional
  return (
    key.trim().startsWith("-----BEGIN PRIVATE KEY-----") ||
    key.trim().startsWith("-----BEGIN RSA PRIVATE KEY-----")
  );
}
