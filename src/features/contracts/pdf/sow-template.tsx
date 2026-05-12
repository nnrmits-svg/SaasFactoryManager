// Template PDF del SOW (Statement of Work). Numerado SOW-XXXX-NN.
// El contenido del SOW viene como markdown; lo renderizamos como párrafos.

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, brand } from './styles';

export interface SowPdfData {
  number_label: string;        // 'SOW-1042-01'
  quote_number_label: string;  // 'SF-1042-01' (referencia al presupuesto aprobado)
  project_name: string;
  client_name?: string | null;
  date_iso: string;
  content_md: string;          // Markdown del alcance
  grand_total_usd: number;
  signer_name?: string | null;
  signer_email?: string | null;
}

export function SowPdfTemplate({ data }: { data: SowPdfData }) {
  const dateFmt = new Date(data.date_iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Renderizado básico de markdown: split por doble \n para párrafos, detectar # headers.
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
        <Text style={pdfStyles.title}>Statement of Work (SOW)</Text>

        {/* Ref presupuesto */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Referencia</Text>
          <Text style={pdfStyles.paragraph}>
            Presupuesto: {data.quote_number_label} · USD ${formatNum(data.grand_total_usd)}
          </Text>
        </View>

        {/* Proyecto + cliente */}
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

        {/* Alcance */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Alcance del trabajo</Text>
          {paragraphs.map((p, idx) => {
            if (p.startsWith('## ')) {
              return (
                <Text key={idx} style={pdfStyles.sectionTitle}>{p.slice(3)}</Text>
              );
            }
            if (p.startsWith('# ')) {
              return (
                <Text key={idx} style={pdfStyles.title}>{p.slice(2)}</Text>
              );
            }
            return (
              <Text key={idx} style={pdfStyles.paragraph}>{p}</Text>
            );
          })}
        </View>

        {/* Consentimiento de firma electrónica (Ley 25.506 ARG) */}
        <View style={pdfStyles.section} break>
          <Text style={pdfStyles.sectionTitle}>Aceptación y consentimiento</Text>
          <Text style={pdfStyles.paragraphMuted}>
            Al firmar electrónicamente este documento, las partes manifiestan su voluntad libre,
            expresa y consciente de aceptar los términos descritos. Reconocen que la firma
            electrónica utilizada (canvas digital o subida de PDF firmado) constituye una firma
            electrónica simple bajo el marco de la Ley 25.506 de la República Argentina, y que es
            válida para evidenciar el acuerdo entre las partes. El sistema registra fecha y hora
            UTC, dirección IP y un hash SHA-256 del contenido y la firma, retenidos por 10 años.
          </Text>
        </View>

        {/* Bloque firmas */}
        <View style={pdfStyles.signatureBlock}>
          <Text style={pdfStyles.sectionTitle}>Firmas</Text>
          <View style={pdfStyles.signatureRow}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Por el cliente</Text>
              <Text style={pdfStyles.signatureName}>
                {data.signer_name ?? '___________________________'}
              </Text>
              {data.signer_email && (
                <Text style={pdfStyles.paragraphMuted}>{data.signer_email}</Text>
              )}
            </View>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureLabel}>Por {brand.company}</Text>
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

function formatNum(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
