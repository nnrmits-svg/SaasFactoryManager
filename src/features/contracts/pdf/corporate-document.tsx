// Template corporativo base reusable para TODOS los documentos formales:
// Propuesta, SOW, NDA, Orden de Compra, Remito, etc.
//
// Inspirado en el formato de propuesta de Grupo ITS (portada estructurada,
// índice, secciones numeradas, tablas BOM) combinado con branding Fluya
// (accent purple #A961FF en headers + numerales).
//
// Uso:
//   <CorporateDocument meta={...}>
//     <CorporatePage>
//       <NumberedSection number="1" title="Índice">
//         <TOC items={[...]} />
//       </NumberedSection>
//     </CorporatePage>
//     <CorporatePage>
//       <NumberedSection number="2" title="Acuerdo de Confidencialidad">
//         <Paragraph>...</Paragraph>
//       </NumberedSection>
//     </CorporatePage>
//   </CorporateDocument>

import {
  Document,
  Page,
  View,
  Text,
  Image,
  type DocumentProps,
} from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { pdfStyles } from './styles';
import { getProviderConfig, type ProviderConfig } from './provider-config';

export interface CorporateMeta {
  /** Tipo de documento (ej: "Propuesta", "SOW", "NDA", "Orden de Compra"). */
  document_type: string;
  /** Número canónico (ej: "SF-1042-01", "SOW-1042-01"). */
  document_number: string;
  /** Versión del documento (default "v01.r01.2026"). */
  version?: string;
  /** Fecha en ISO. */
  date_iso: string;
  /** Subtítulo opcional debajo del título (ej: nombre del proyecto). */
  subtitle?: string;
  /** Datos del cliente. */
  client_name: string;
  client_logo_url?: string | null;
  client_responsible_name?: string | null;
  client_responsible_email?: string | null;
  client_address?: string | null;
  /** Responsables del proveedor. */
  account_executive?: string | null;
  /** Si null, usa el director del provider config. */
  engineering_director?: string | null;
  /** Override del provider config (rara vez). */
  provider_override?: Partial<ProviderConfig>;
}

interface CorporateDocumentProps {
  meta: CorporateMeta;
  children: ReactNode;
}

/** Wrapper alrededor de <Document> con cover page auto-generada y páginas hijas. */
export function CorporateDocument({ meta, children }: CorporateDocumentProps) {
  const provider = { ...getProviderConfig(), ...meta.provider_override };
  return (
    <Document>
      <CoverPage meta={meta} provider={provider} />
      {children}
    </Document>
  );
}

// ============================================================
// COVER PAGE
// ============================================================
function CoverPage({
  meta,
  provider,
}: {
  meta: CorporateMeta;
  provider: ProviderConfig;
}) {
  const dateFmt = new Date(meta.date_iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const version = meta.version ?? defaultVersion(meta.date_iso);
  const director = meta.engineering_director ?? provider.director;

  return (
    <Page size="A4" style={pdfStyles.page}>
      {/* Logo del proveedor arriba a la derecha */}
      <View style={pdfStyles.coverHeader}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={provider.logo_url} style={pdfStyles.coverLogo} />
      </View>

      {/* Tabla de datos */}
      <View style={pdfStyles.metaTable}>
        <MetaRow label="Empresa">
          {meta.client_logo_url ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 10 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={meta.client_logo_url} style={{ width: 80, height: 'auto', marginRight: 8 }} />
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0B001E' }}>{meta.client_name}</Text>
            </View>
          ) : (
            <Text style={pdfStyles.metaValueStrong}>{meta.client_name}</Text>
          )}
        </MetaRow>

        <MetaRow label="Responsable">
          <View style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 10 }}>
            {meta.client_responsible_name && (
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{meta.client_responsible_name}</Text>
            )}
            {meta.client_responsible_email && (
              <Text style={{ fontSize: 9, color: '#6B6B7B', marginTop: 1 }}>
                {meta.client_responsible_email}
              </Text>
            )}
            {meta.client_address && (
              <Text style={{ fontSize: 9, color: '#1A1A2E', marginTop: 1 }}>{meta.client_address}</Text>
            )}
            {!meta.client_responsible_name &&
              !meta.client_responsible_email &&
              !meta.client_address && (
                <Text style={{ fontSize: 9, color: '#9B9BA8' }}>—</Text>
              )}
          </View>
        </MetaRow>

        <MetaRow label="Fecha">
          <Text style={pdfStyles.metaValue}>{dateFmt}</Text>
        </MetaRow>

        <MetaRow label={`Nro. ${meta.document_type}`}>
          <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#A961FF' }}>
              {meta.document_number}
            </Text>
            {meta.subtitle && (
              <Text style={{ fontSize: 9, color: '#6B6B7B', marginTop: 2 }}>
                {meta.subtitle}
              </Text>
            )}
          </View>
        </MetaRow>

        {meta.account_executive && (
          <MetaRow label="Ejecutivo de Cuenta">
            <Text style={pdfStyles.metaValue}>{meta.account_executive}</Text>
          </MetaRow>
        )}

        <MetaRow label="Director de Ingeniería">
          <Text style={pdfStyles.metaValue}>{director}</Text>
        </MetaRow>

        <MetaRow label="Datos Empresa">
          <View style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0B001E' }}>
              {provider.legal_name}
            </Text>
            {provider.tax_id && provider.tax_id !== '—' && (
              <Text style={{ fontSize: 9, color: '#1A1A2E', marginTop: 1 }}>
                CUIT: {provider.tax_id}
              </Text>
            )}
            {provider.vat_status && (
              <Text style={{ fontSize: 9, color: '#1A1A2E', marginTop: 1 }}>
                {provider.vat_status}
              </Text>
            )}
          </View>
        </MetaRow>

        <View style={pdfStyles.metaRowLast}>
          <Text style={pdfStyles.metaLabel}>Versión</Text>
          <Text style={pdfStyles.metaValueStrong}>{version}</Text>
        </View>
      </View>

      <CorporateFooter meta={meta} provider={provider} />
    </Page>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={pdfStyles.metaRow}>
      <Text style={pdfStyles.metaLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ============================================================
// CORPORATE PAGE (página interna con header chico + footer)
// ============================================================
export function CorporatePage({
  meta,
  children,
}: {
  meta: CorporateMeta;
  children: ReactNode;
}) {
  const provider = { ...getProviderConfig(), ...meta.provider_override };
  return (
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.internalHeader}>
        <Text style={pdfStyles.internalHeaderTitle}>
          {meta.document_type} · {meta.document_number}
        </Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={provider.logo_url} style={pdfStyles.internalHeaderLogo} />
      </View>
      {children}
      <CorporateFooter meta={meta} provider={provider} />
    </Page>
  );
}

// ============================================================
// SECCIÓN NUMERADA (ej: "1. Índice")
// ============================================================
export function NumberedSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={pdfStyles.numberedSectionTitle}>
        {number}. {title}
      </Text>
      {children}
    </View>
  );
}

export function NumberedSubSection({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={pdfStyles.numberedSubSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ============================================================
// FOOTER corporativo (paginación + nombre del documento)
// ============================================================
function CorporateFooter({
  meta,
  provider,
}: {
  meta: CorporateMeta;
  provider: ProviderConfig;
}) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        {provider.name} · {meta.document_number}
      </Text>
      <Text
        style={pdfStyles.footerText}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} | ${totalPages}`}
      />
    </View>
  );
}

// ============================================================
// HELPERS DE CONTENIDO REUSABLES
// ============================================================

/** Cláusula estándar de confidencialidad (Ley 25.506 ARG + propietario). */
export function ConfidentialityClause({ provider }: { provider?: ProviderConfig }) {
  const p = provider ?? getProviderConfig();
  return (
    <Text style={pdfStyles.paragraph}>
      El material descriptivo y la información relativa a esta propuesta son confidenciales y
      propiedad de <Text style={{ fontWeight: 'bold' }}>{p.legal_name}</Text>. Esta información se
      envía en el marco del conocimiento expreso que se mantendrá en estricta confidencialidad y
      no será divulgada, duplicada o utilizada, en forma parcial o total, para cualquier otra
      finalidad que la evaluación de esta propuesta. La firma electrónica simple aplicada al
      presente documento constituye evidencia válida bajo el marco de la Ley 25.506 de la
      República Argentina.
    </Text>
  );
}

/** Índice/TOC con entradas (item + página). Página opcional, si no se sabe queda vacío. */
export function TableOfContents({
  items,
}: {
  items: Array<{ label: string; page?: string }>;
}) {
  return (
    <View style={{ marginTop: 8 }}>
      {items.map((item, idx) => (
        <View
          key={idx}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 4,
            borderBottomWidth: 0.5,
            borderBottomColor: '#E0E0E8',
            borderBottomStyle: 'dotted',
          }}
        >
          <Text style={{ fontSize: 10, color: '#1A1A2E' }}>{item.label}</Text>
          <Text style={{ fontSize: 10, color: '#6B6B7B' }}>{item.page ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================
// HELPER: tipo para los Documents que reciben el wrapper
// ============================================================
export type CorporatePdfElement = ReturnType<typeof CorporateDocument> & {
  type: typeof Document;
  props: DocumentProps;
};

function defaultVersion(date_iso: string): string {
  const d = new Date(date_iso);
  const year = d.getFullYear();
  return `v01.r01.${year}`;
}
