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
});

export const brand = {
  name: 'Factory Manager',
  company: 'Fluya Studio',
  tagline: 'Business OS para tu fábrica de software',
};
