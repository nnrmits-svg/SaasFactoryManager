// Estilos compartidos para todos los templates PDF (Quote / SOW / NDA).
// Paleta consistente con el branding Fluya (oscuro inverso para PDF print-friendly).

import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 48,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#A961FF',
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B001E',
  },
  brandSubtitle: {
    fontSize: 9,
    color: '#6B6B7B',
    marginTop: 2,
  },
  docNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A961FF',
    textAlign: 'right',
  },
  docDate: {
    fontSize: 9,
    color: '#6B6B7B',
    textAlign: 'right',
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0B001E',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0B001E',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.5,
    marginBottom: 8,
    color: '#1A1A2E',
  },
  paragraphMuted: {
    fontSize: 10,
    color: '#6B6B7B',
    lineHeight: 1.5,
  },
  table: {
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0EBFF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A961FF',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E8',
  },
  tableCellLabel: {
    flex: 4,
    fontSize: 10,
  },
  tableCellQty: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
  },
  tableCellPrice: {
    flex: 1.5,
    fontSize: 10,
    textAlign: 'right',
  },
  tableCellTotal: {
    flex: 1.5,
    fontSize: 10,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#0B001E',
  },
  totalsBox: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0B001E',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#6B6B7B',
  },
  totalsValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0B001E',
    marginTop: 6,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A961FF',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E8',
  },
  footerText: {
    fontSize: 8,
    color: '#9B9BA8',
  },
  signatureBlock: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0B001E',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 0.5,
    borderTopColor: '#1A1A2E',
    paddingTop: 6,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6B6B7B',
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },

  // ============================================================
  // CORPORATE TEMPLATE (estilo Grupo ITS / propuesta formal)
  // ============================================================

  /** Header de la portada: logo a la izquierda, nada más arriba. */
  coverHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 36,
  },
  coverLogo: {
    width: 110,
    height: 'auto',
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0B001E',
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 11,
    color: '#6B6B7B',
    marginBottom: 24,
  },

  /** Tabla de datos de la portada (EMPRESA / RESPONSABLE / FECHA / NRO / Versión). */
  metaTable: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1A1A2E',
  },
  metaRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A1A2E',
    minHeight: 28,
  },
  metaRowLast: {
    flexDirection: 'row',
    minHeight: 28,
  },
  metaLabel: {
    width: '32%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0B001E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderRightWidth: 0.5,
    borderRightColor: '#1A1A2E',
    textAlign: 'center',
  },
  metaValue: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
    color: '#1A1A2E',
  },
  metaValueStrong: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0B001E',
  },
  metaValueAccent: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#A961FF',
  },

  /** Header de páginas internas (2+): logo chico + número de doc. */
  internalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E8',
  },
  internalHeaderLogo: {
    width: 60,
    height: 'auto',
  },
  internalHeaderTitle: {
    fontSize: 10,
    color: '#6B6B7B',
  },

  /** Encabezados de sección numerados (ej: "1. Índice", "2. Acuerdo de Confidencialidad"). */
  numberedSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#A961FF',
    marginBottom: 12,
    marginTop: 8,
  },
  numberedSubSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#A961FF',
    marginBottom: 8,
    marginTop: 4,
  },

  /** Tabla estilo BOM (header azul intenso, # / SKU / Description / Qty). */
  bomTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  bomTableHeaderTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  bomSubHeader: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F8',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  bomSubHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0B001E',
    textTransform: 'uppercase',
  },
  bomCellNum: { width: 30, fontSize: 9, textAlign: 'center' },
  bomCellSku: { flex: 2, fontSize: 9, paddingRight: 6 },
  bomCellDesc: { flex: 4, fontSize: 9, paddingRight: 6 },
  bomCellQty: { width: 40, fontSize: 9, textAlign: 'right' },
  bomCellPrice: { flex: 1.5, fontSize: 9, textAlign: 'right' },
  bomCellTotal: { flex: 1.5, fontSize: 9, textAlign: 'right', fontWeight: 'bold' },
  bomRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E8',
  },

});

export const brand = {
  name: 'Factory Manager',
  company: 'Fluya Studio',
  tagline: 'Business OS para tu fábrica de software',
};
