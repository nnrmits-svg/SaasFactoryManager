// Configuración del proveedor (la empresa que emite los documentos).
// Leído de env vars para permitir switch fácil entre Fluya Studio y Grupo ITS
// sin tocar código.
//
// Ejemplos:
//   COMPANY_NAME="Fluya Studio"
//   COMPANY_LEGAL_NAME="Fluya S.A."
//   COMPANY_TAX_ID="30-XXXXXXXX-X"
//   COMPANY_VAT_STATUS="IVA Responsable Inscripto"
//   COMPANY_TAGLINE="Business OS para tu fábrica de software"
//   COMPANY_LOGO_URL="https://saasfactory.grupo-its.com.ar/Fluya-Logo-Ult.jpg"
//   COMPANY_ADDRESS="Buenos Aires, Argentina"
//   COMPANY_DIRECTOR="Ricardo Marchetti"

export interface ProviderConfig {
  /** Nombre comercial (ej: "Fluya Studio"). */
  name: string;
  /** Razón social legal (ej: "Fluya S.A."). */
  legal_name: string;
  /** CUIT / Tax ID. */
  tax_id: string;
  /** Condición frente al IVA. */
  vat_status: string;
  /** Tagline / descripción corta. */
  tagline: string;
  /** URL pública o ruta del logo. */
  logo_url: string;
  /** Dirección física. */
  address: string;
  /** Nombre del Director de Ingeniería / Responsable técnico. */
  director: string;
}

export function getProviderConfig(): ProviderConfig {
  return {
    name: process.env.COMPANY_NAME ?? 'Fluya Studio',
    legal_name: process.env.COMPANY_LEGAL_NAME ?? 'Fluya Studio',
    tax_id: process.env.COMPANY_TAX_ID ?? '—',
    vat_status: process.env.COMPANY_VAT_STATUS ?? 'IVA Responsable Inscripto',
    tagline:
      process.env.COMPANY_TAGLINE ?? 'Business OS para tu fábrica de software',
    logo_url:
      process.env.COMPANY_LOGO_URL ??
      'https://saasfactory.grupo-its.com.ar/Fluya-Logo-Ult.jpg',
    address: process.env.COMPANY_ADDRESS ?? 'Buenos Aires, Argentina',
    director: process.env.COMPANY_DIRECTOR ?? 'Ricardo Marchetti',
  };
}
