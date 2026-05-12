// Template PDF de Presupuesto (Quote). Numerado SF-XXXX-NN.
// Genera un documento de cotización imprimible con line items y totales.

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, brand } from './styles';
import type { QuoteLineItem, QuoteTotals } from '../types';

export interface QuotePdfData {
  number_label: string;       // 'SF-1042-01'
  project_name: string;
  client_name?: string | null;
  date_iso: string;            // ISO timestamp
  line_items: QuoteLineItem[];
  totals: QuoteTotals;
  profit_margin_pct: number;
  notes?: string | null;
  prepared_by?: string | null; // founder/operator name
}

export function QuotePdfTemplate({ data }: { data: QuotePdfData }) {
  const dateFmt = new Date(data.date_iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.brand}>{brand.name}</Text>
            <Text style={pdfStyles.brandSubtitle}>{brand.company} · {brand.tagline}</Text>
          </View>
          <View>
            <Text style={pdfStyles.docNumber}>{data.number_label}</Text>
            <Text style={pdfStyles.docDate}>{dateFmt}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={pdfStyles.title}>Presupuesto</Text>

        {/* Project + client */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Proyecto</Text>
          <Text style={pdfStyles.paragraph}>{data.project_name}</Text>
          {data.client_name && (
            <>
              <Text style={pdfStyles.sectionTitle}>Cliente</Text>
              <Text style={pdfStyles.paragraph}>{data.client_name}</Text>
            </>
          )}
        </View>

        {/* Line items table */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Detalle</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableCellLabel, pdfStyles.tableCellHeader]}>Concepto</Text>
              <Text style={[pdfStyles.tableCellQty, pdfStyles.tableCellHeader]}>Cant.</Text>
              <Text style={[pdfStyles.tableCellPrice, pdfStyles.tableCellHeader]}>Unitario</Text>
              <Text style={[pdfStyles.tableCellTotal, pdfStyles.tableCellHeader]}>Total</Text>
            </View>
            {data.line_items.map((item, idx) => (
              <View key={idx} style={pdfStyles.tableRow}>
                <Text style={pdfStyles.tableCellLabel}>{item.label}</Text>
                <Text style={pdfStyles.tableCellQty}>{formatNum(item.qty)}</Text>
                <Text style={pdfStyles.tableCellPrice}>${formatNum(item.unit_price_usd)}</Text>
                <Text style={pdfStyles.tableCellTotal}>${formatNum(item.total_usd)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={pdfStyles.totalsBox}>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Subtotal</Text>
              <Text style={pdfStyles.totalsValue}>${formatNum(data.totals.subtotal_usd)}</Text>
            </View>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>
                Utilidad ({data.profit_margin_pct}%)
              </Text>
              <Text style={pdfStyles.totalsValue}>
                ${formatNum(data.totals.profit_amount_usd)}
              </Text>
            </View>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.grandTotalLabel}>TOTAL USD</Text>
              <Text style={pdfStyles.grandTotalValue}>
                ${formatNum(data.totals.grand_total_usd)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Notas</Text>
            <Text style={pdfStyles.paragraphMuted}>{data.notes}</Text>
          </View>
        )}

        {/* Conditions footer */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Condiciones</Text>
          <Text style={pdfStyles.paragraphMuted}>
            Presupuesto válido por 30 días desde la fecha de emisión. Los precios están expresados en
            dólares estadounidenses (USD) sin IVA. La aprobación de este presupuesto autoriza el
            inicio del proyecto y dispara la firma del Statement of Work (SOW).
          </Text>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>{brand.company} · {data.number_label}</Text>
          <Text
            style={pdfStyles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
