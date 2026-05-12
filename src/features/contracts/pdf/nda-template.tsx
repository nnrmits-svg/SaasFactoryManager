// Template PDF del NDA (Non-Disclosure Agreement). Numerado NDA-XXXX-NN.

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, brand } from './styles';

export interface NdaPdfData {
  number_label: string;       // 'NDA-1042-01'
  client_name: string;
  client_tax_id?: string | null;
  date_iso: string;
  content_md: string;          // Markdown del cuerpo
  signer_name?: string | null;
  signer_email?: string | null;
}

export function NdaPdfTemplate({ data }: { data: NdaPdfData }) {
  const dateFmt = new Date(data.date_iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const paragraphs = data.content_md.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

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
        <Text style={pdfStyles.title}>Acuerdo de Confidencialidad (NDA)</Text>

        {/* Partes */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Partes</Text>
          <Text style={pdfStyles.paragraph}>
            Por una parte, {brand.company} (en adelante "el Receptor"), y por la otra,{' '}
            {data.client_name}
            {data.client_tax_id ? ` (CUIT/Tax ID ${data.client_tax_id})` : ''} (en adelante "el
            Divulgador"), acuerdan los términos del presente Acuerdo de Confidencialidad.
          </Text>
        </View>

        {/* Cuerpo */}
        <View style={pdfStyles.section}>
          {paragraphs.map((p, idx) => {
            if (p.startsWith('## ')) {
              return (
                <Text key={idx} style={pdfStyles.sectionTitle}>{p.slice(3)}</Text>
              );
            }
            return (
              <Text key={idx} style={pdfStyles.paragraph}>{p}</Text>
            );
          })}
        </View>

        {/* Cláusula firma electrónica */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Aceptación y firma electrónica</Text>
          <Text style={pdfStyles.paragraphMuted}>
            Las partes aceptan que la firma electrónica simple aplicada en este documento, bajo el
            marco de la Ley 25.506 de la República Argentina, constituye evidencia válida del
            consentimiento expresado. El sistema registra fecha/hora UTC, IP y hash SHA-256, los
            cuales se preservan por 10 años.
          </Text>
        </View>

        {/* Firmas */}
        <View style={pdfStyles.signatureBlock}>
          <Text style={pdfStyles.sectionTitle}>Firmas</Text>
          <View style={pdfStyles.signatureRow}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Divulgador (Cliente)</Text>
              <Text style={pdfStyles.signatureName}>
                {data.signer_name ?? '___________________________'}
              </Text>
              {data.signer_email && (
                <Text style={pdfStyles.paragraphMuted}>{data.signer_email}</Text>
              )}
            </View>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Receptor ({brand.company})</Text>
              <Text style={pdfStyles.signatureName}>___________________________</Text>
            </View>
          </View>
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
