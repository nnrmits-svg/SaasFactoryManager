// Template PDF de Presupuesto (Quote). Numerado SF-XXXX-NN.
// Usa el wrapper corporate-document para portada estructurada + branding Fluya.
// Items agrupados por tipo en tablas estilo BOM.

import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import {
  CorporateDocument,
  CorporatePage,
  NumberedSection,
  ConfidentialityClause,
  type CorporateMeta,
} from './corporate-document';
import { getProviderConfig } from './provider-config';
import type { QuoteLineItem, QuoteTotals, LineItemType } from '../types';

export interface QuotePdfData {
  number_label: string;        // 'SF-1042-01'
  project_name: string;
  client_name?: string | null;
  client_logo_url?: string | null;
  client_responsible_name?: string | null;
  client_responsible_email?: string | null;
  client_address?: string | null;
  date_iso: string;
  line_items: QuoteLineItem[];
  totals: QuoteTotals;
  profit_margin_pct: number;
  notes?: string | null;
  account_executive?: string | null;
  version?: string;
}

const CATEGORY_LABELS: Record<LineItemType, string> = {
  ai_tokens: 'IA Tokens',
  labor: 'Labor (Mano de Obra)',
  fixed_cost: 'Licencias / APIs / Gastos Fijos',
  overhead: 'Estructura Empresarial',
  profit: 'Utilidad Aplicada',
};

export function QuotePdfTemplate({ data }: { data: QuotePdfData }) {
  const provider = getProviderConfig();
  const meta: CorporateMeta = {
    document_type: 'Propuesta',
    document_number: data.number_label,
    version: data.version,
    date_iso: data.date_iso,
    subtitle: data.project_name,
    client_name: data.client_name ?? '—',
    client_logo_url: data.client_logo_url,
    client_responsible_name: data.client_responsible_name,
    client_responsible_email: data.client_responsible_email,
    client_address: data.client_address,
    account_executive: data.account_executive,
  };

  // Agrupar items por tipo
  const grouped = groupByType(data.line_items);

  return (
    <CorporateDocument meta={meta}>
      {/* Page 2: Objeto + Tablas + Totales */}
      <CorporatePage meta={meta}>
        <NumberedSection number="1" title="Acuerdo de Confidencialidad">
          <ConfidentialityClause provider={provider} />
        </NumberedSection>

        <NumberedSection number="2" title="Objeto del documento">
          <Text style={pdfStyles.paragraph}>
            Se adjunta el listado de conceptos y costos correspondientes al proyecto{' '}
            <Text style={{ fontWeight: 'bold' }}>{data.project_name}</Text>. Esta propuesta tiene
            una validez de 30 días desde la fecha de emisión. Los precios están expresados en
            dólares estadounidenses (USD) sin IVA.
          </Text>
        </NumberedSection>
      </CorporatePage>

      {/* Page 3+: Items + Totales + Condiciones */}
      <CorporatePage meta={meta}>
        <NumberedSection number="3" title="Listado de Conceptos y Costos">
          {Object.entries(grouped).map(([type, items]) =>
            items.length > 0 ? (
              <BomTable
                key={type}
                title={CATEGORY_LABELS[type as LineItemType]}
                items={items}
              />
            ) : null,
          )}

          <TotalsBlock totals={data.totals} marginPct={data.profit_margin_pct} />
        </NumberedSection>

        {data.notes && (
          <NumberedSection number="4" title="Notas">
            <Text style={pdfStyles.paragraphMuted}>{data.notes}</Text>
          </NumberedSection>
        )}

        <NumberedSection number={data.notes ? '5' : '4'} title="Condiciones">
          <Text style={pdfStyles.paragraphMuted}>
            • Presupuesto válido por 30 días desde la fecha de emisión.{'\n'}
            • Precios expresados en USD sin IVA.{'\n'}
            • La aprobación de este presupuesto autoriza el inicio del proyecto y dispara la firma
            del Statement of Work (SOW).{'\n'}
            • Cambios de alcance posteriores se documentan como ampliaciones (AMP-XXXX-MM) que
            recotizan y requieren nueva aprobación.{'\n'}
            • Forma de pago: a definir entre las partes al momento de aprobación del SOW.
          </Text>
        </NumberedSection>
      </CorporatePage>
    </CorporateDocument>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function BomTable({ title, items }: { title: string; items: QuoteLineItem[] }) {
  const subtotal = items.reduce((s, i) => s + i.total_usd, 0);
  return (
    <View style={{ marginBottom: 14 }} wrap={false}>
      <View style={pdfStyles.bomTableHeader}>
        <Text style={pdfStyles.bomTableHeaderTitle}>{title.toUpperCase()}</Text>
      </View>
      <View style={pdfStyles.bomSubHeader}>
        <Text style={[pdfStyles.bomCellNum, pdfStyles.bomSubHeaderCell]}>#</Text>
        <Text style={[pdfStyles.bomCellDesc, pdfStyles.bomSubHeaderCell]}>Concepto</Text>
        <Text style={[pdfStyles.bomCellQty, pdfStyles.bomSubHeaderCell]}>Cant.</Text>
        <Text style={[pdfStyles.bomCellPrice, pdfStyles.bomSubHeaderCell]}>Unitario</Text>
        <Text style={[pdfStyles.bomCellTotal, pdfStyles.bomSubHeaderCell]}>Total</Text>
      </View>
      {items.map((item, idx) => (
        <View key={idx} style={pdfStyles.bomRow}>
          <Text style={pdfStyles.bomCellNum}>{idx + 1}</Text>
          <Text style={pdfStyles.bomCellDesc}>{item.label}</Text>
          <Text style={pdfStyles.bomCellQty}>{formatNum(item.qty)}</Text>
          <Text style={pdfStyles.bomCellPrice}>${formatNum(item.unit_price_usd)}</Text>
          <Text style={pdfStyles.bomCellTotal}>${formatNum(item.total_usd)}</Text>
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingVertical: 4,
          paddingHorizontal: 8,
          backgroundColor: '#F4F4F8',
        }}
      >
        <Text style={{ fontSize: 9, color: '#6B6B7B', marginRight: 8 }}>Subtotal {title}:</Text>
        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0B001E' }}>
          ${formatNum(subtotal)}
        </Text>
      </View>
    </View>
  );
}

function TotalsBlock({
  totals,
  marginPct,
}: {
  totals: QuoteTotals;
  marginPct: number;
}) {
  return (
    <View style={pdfStyles.totalsBox} wrap={false}>
      <View style={pdfStyles.totalsRow}>
        <Text style={pdfStyles.totalsLabel}>Subtotal (costo base)</Text>
        <Text style={pdfStyles.totalsValue}>${formatNum(totals.subtotal_usd)}</Text>
      </View>
      <View style={pdfStyles.totalsRow}>
        <Text style={pdfStyles.totalsLabel}>Utilidad aplicada ({marginPct}%)</Text>
        <Text style={pdfStyles.totalsValue}>${formatNum(totals.profit_amount_usd)}</Text>
      </View>
      <View style={pdfStyles.totalsRow}>
        <Text style={pdfStyles.grandTotalLabel}>TOTAL USD</Text>
        <Text style={pdfStyles.grandTotalValue}>${formatNum(totals.grand_total_usd)}</Text>
      </View>
    </View>
  );
}

// ============================================================
// Helpers
// ============================================================

function groupByType(items: QuoteLineItem[]): Record<LineItemType, QuoteLineItem[]> {
  const empty: Record<LineItemType, QuoteLineItem[]> = {
    ai_tokens: [],
    labor: [],
    fixed_cost: [],
    overhead: [],
    profit: [],
  };
  for (const item of items) {
    empty[item.type].push(item);
  }
  return empty;
}

function formatNum(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
