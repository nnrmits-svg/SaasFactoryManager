// Template PDF del SOW (Statement of Work). Numerado SOW-XXXX-NN.
// Usa el wrapper corporate-document. El alcance viene como markdown y se renderiza
// como párrafos / sub-secciones.

import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import {
  CorporateDocument,
  CorporatePage,
  NumberedSection,
  NumberedSubSection,
  ConfidentialityClause,
  type CorporateMeta,
} from './corporate-document';
import { getProviderConfig } from './provider-config';

export interface SowPdfData {
  number_label: string;        // 'SOW-1042-01'
  quote_number_label: string;  // 'SF-1042-01' (referencia al presupuesto aprobado)
  project_name: string;
  client_name?: string | null;
  client_logo_url?: string | null;
  client_responsible_name?: string | null;
  client_responsible_email?: string | null;
  client_address?: string | null;
  date_iso: string;
  content_md: string;          // Markdown del alcance
  grand_total_usd: number;
  signer_name?: string | null;
  signer_email?: string | null;
  account_executive?: string | null;
  version?: string;
}

export function SowPdfTemplate({ data }: { data: SowPdfData }) {
  const provider = getProviderConfig();
  const meta: CorporateMeta = {
    document_type: 'SOW',
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

  const blocks = parseMarkdownBlocks(data.content_md);

  return (
    <CorporateDocument meta={meta}>
      {/* Page 2: Confidencialidad + Referencia + Alcance */}
      <CorporatePage meta={meta}>
        <NumberedSection number="1" title="Acuerdo de Confidencialidad">
          <ConfidentialityClause provider={provider} />
        </NumberedSection>

        <NumberedSection number="2" title="Referencia">
          <Text style={pdfStyles.paragraph}>
            Este Statement of Work (SOW) instrumenta el alcance del proyecto cotizado en el
            presupuesto <Text style={{ fontWeight: 'bold' }}>{data.quote_number_label}</Text> por
            un total de <Text style={{ fontWeight: 'bold' }}>USD ${formatNum(data.grand_total_usd)}</Text>.
          </Text>
        </NumberedSection>

        <NumberedSection number="3" title="Alcance del Trabajo">
          {blocks.map((b, idx) => renderBlock(b, idx))}
        </NumberedSection>
      </CorporatePage>

      {/* Page N: Cláusula de firma + bloque de firmas */}
      <CorporatePage meta={meta}>
        <NumberedSection number="4" title="Aceptación y Consentimiento">
          <Text style={pdfStyles.paragraphMuted}>
            Al firmar electrónicamente este documento, las partes manifiestan su voluntad libre,
            expresa y consciente de aceptar los términos descritos. Reconocen que la firma
            electrónica utilizada (canvas digital o subida de PDF firmado) constituye una firma
            electrónica simple bajo el marco de la Ley 25.506 de la República Argentina, y que es
            válida para evidenciar el acuerdo entre las partes. El sistema registra fecha y hora
            UTC, dirección IP y un hash SHA-256 del contenido y la firma, retenidos por 10 años.
          </Text>
        </NumberedSection>

        <View style={pdfStyles.signatureBlock}>
          <Text style={pdfStyles.sectionTitle}>Firmas</Text>
          <View style={pdfStyles.signatureRow}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Por el cliente ({data.client_name ?? '—'})</Text>
              <Text style={pdfStyles.signatureName}>
                {data.signer_name ?? '___________________________'}
              </Text>
              {data.signer_email && (
                <Text style={pdfStyles.paragraphMuted}>{data.signer_email}</Text>
              )}
            </View>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Por {provider.name}</Text>
              <Text style={pdfStyles.signatureName}>___________________________</Text>
            </View>
          </View>
        </View>
      </CorporatePage>
    </CorporateDocument>
  );
}

// ============================================================
// Helpers de renderizado markdown simple
// ============================================================

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list-item'; text: string };

function parseMarkdownBlocks(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let paraBuffer: string[] = [];

  function flushParagraph() {
    if (paraBuffer.length > 0) {
      blocks.push({ kind: 'paragraph', text: paraBuffer.join(' ').trim() });
      paraBuffer = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({ kind: 'h2', text: line.slice(3) });
    } else if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push({ kind: 'h3', text: line.slice(4) });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      blocks.push({ kind: 'list-item', text: line.slice(2) });
    } else {
      paraBuffer.push(line);
    }
  }
  flushParagraph();
  return blocks;
}

function renderBlock(block: Block, key: number) {
  if (block.kind === 'h2') {
    return <NumberedSubSection key={key} title={block.text} />;
  }
  if (block.kind === 'h3') {
    return (
      <Text key={key} style={[pdfStyles.sectionTitle, { marginTop: 6 }]}>
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'list-item') {
    return (
      <View key={key} style={{ flexDirection: 'row', marginBottom: 3 }}>
        <Text style={{ fontSize: 10, marginRight: 6 }}>•</Text>
        <Text style={[pdfStyles.paragraph, { flex: 1, marginBottom: 0 }]}>{block.text}</Text>
      </View>
    );
  }
  return (
    <Text key={key} style={pdfStyles.paragraph}>
      {block.text}
    </Text>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
