// Template PDF del NDA (Non-Disclosure Agreement). Numerado NDA-XXXX-NN.
// Usa el wrapper corporate-document. Cláusulado viene en markdown.

import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import {
  CorporateDocument,
  CorporatePage,
  NumberedSection,
  NumberedSubSection,
  type CorporateMeta,
} from './corporate-document';
import { getProviderConfig } from './provider-config';

export interface NdaPdfData {
  number_label: string;       // 'NDA-1042-01'
  client_name: string;
  client_logo_url?: string | null;
  client_tax_id?: string | null;
  client_responsible_name?: string | null;
  client_responsible_email?: string | null;
  client_address?: string | null;
  date_iso: string;
  content_md: string;          // Markdown del cuerpo
  signer_name?: string | null;
  signer_email?: string | null;
  account_executive?: string | null;
  version?: string;
}

export function NdaPdfTemplate({ data }: { data: NdaPdfData }) {
  const provider = getProviderConfig();
  const meta: CorporateMeta = {
    document_type: 'NDA',
    document_number: data.number_label,
    version: data.version,
    date_iso: data.date_iso,
    client_name: data.client_name,
    client_logo_url: data.client_logo_url,
    client_responsible_name: data.client_responsible_name,
    client_responsible_email: data.client_responsible_email,
    client_address: data.client_address,
    account_executive: data.account_executive,
  };

  const blocks = parseMarkdownBlocks(data.content_md);

  return (
    <CorporateDocument meta={meta}>
      <CorporatePage meta={meta}>
        <NumberedSection number="1" title="Partes">
          <Text style={pdfStyles.paragraph}>
            Por una parte, <Text style={{ fontWeight: 'bold' }}>{provider.legal_name}</Text>
            {provider.tax_id && provider.tax_id !== '—' ? ` (CUIT ${provider.tax_id})` : ''}
            {' '}(en adelante "el Receptor"), y por la otra,{' '}
            <Text style={{ fontWeight: 'bold' }}>{data.client_name}</Text>
            {data.client_tax_id ? ` (CUIT/Tax ID ${data.client_tax_id})` : ''}
            {' '}(en adelante "el Divulgador"), acuerdan los términos del presente Acuerdo de
            Confidencialidad.
          </Text>
        </NumberedSection>

        <NumberedSection number="2" title="Términos del Acuerdo">
          {blocks.map((b, idx) => renderBlock(b, idx))}
        </NumberedSection>

        <NumberedSection number="3" title="Aceptación y Firma Electrónica">
          <Text style={pdfStyles.paragraphMuted}>
            Las partes aceptan que la firma electrónica simple aplicada en este documento, bajo el
            marco de la Ley 25.506 de la República Argentina, constituye evidencia válida del
            consentimiento expresado. El sistema registra fecha/hora UTC, IP y hash SHA-256, los
            cuales se preservan por 10 años.
          </Text>
        </NumberedSection>

        <View style={pdfStyles.signatureBlock}>
          <Text style={pdfStyles.sectionTitle}>Firmas</Text>
          <View style={pdfStyles.signatureRow}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Divulgador ({data.client_name})</Text>
              <Text style={pdfStyles.signatureName}>
                {data.signer_name ?? '___________________________'}
              </Text>
              {data.signer_email && (
                <Text style={pdfStyles.paragraphMuted}>{data.signer_email}</Text>
              )}
            </View>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Receptor ({provider.name})</Text>
              <Text style={pdfStyles.signatureName}>___________________________</Text>
            </View>
          </View>
        </View>
      </CorporatePage>
    </CorporateDocument>
  );
}

// ============================================================
// Helpers de renderizado markdown (copia del SOW; podrían compartirse)
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
