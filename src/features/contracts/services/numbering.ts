// Helpers de numeracion para los documentos del sistema de contratos.
// El project_number lo asigna el trigger PG (tg_projects_set_number).
// version y amendment_number los lleva la aplicacion (consultando max + 1).

export function formatQuoteNumber(projectNumber: number, version: number): string {
  return `SF-${projectNumber}-${pad2(version)}`;
}

export function formatSowNumber(projectNumber: number, version: number): string {
  return `SOW-${projectNumber}-${pad2(version)}`;
}

export function formatNdaNumber(projectNumber: number, version: number): string {
  return `NDA-${projectNumber}-${pad2(version)}`;
}

export function formatAmendmentNumber(projectNumber: number, amendmentNumber: number): string {
  return `AMP-${projectNumber}-${pad2(amendmentNumber)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
