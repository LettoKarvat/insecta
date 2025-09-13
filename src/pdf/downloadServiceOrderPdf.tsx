import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Font,
} from "@react-pdf/renderer";

/* ───────────────── FONTE / HIFENIZAÇÃO ───────────────── */
Font.registerHyphenationCallback((word) => [word]);

/* ───────────────── TIPOS ───────────────── */
interface PrintableData {
  order?: {
    public_code?: string;
    created_at?: string;
    scheduled_at?: string;
    status_text?: string;
    notes?: string;
  };
  client?: {
    name?: string;
    doc?: string;
    address?: string;
    phone?: string;
    email?: string;
    city?: string;
    zip?: string;
  };
  items?: Array<{
    pest?: string;
    product?: string;
    application?: string;
    dilution?: string;
    quantity?: string | number;
    registration_ms?: string;
    group_chemical?: string;
    composition?: string;
    recommended_dilution?: string;
    toxicity_action?: string;
    antidote?: string;
    emergency_phone?: string; // ⬅️ novo
    garantia?: string;
  }>;
  technicians?: Array<{
    name?: string;
    registry?: string;
    signature_url?: string;
  }>;
  client_signature?: {
    name?: string;
    cpf?: string;
  };
  /** Bloco específico do certificado (se o back não mandar, calculamos) */
  certificate?: {
    service_type?: string; // ex.: "DESCUPINIZAÇÃO"
    issue_city?: string; // ex.: "Campo Alegre"
    execution_days?: number; // ex.: 5
    execution_note?: string;
    validity_months?: number; // ex.: 24
    valid_until?: string; // ISO
    methods?: string[]; // ["Pulverização", "Injeção em madeira", ...]
    inspections?: string[]; // 4 datas ISO: +6, +12, +18, +24 meses
  };
  validation_url?: string;
  generated_at?: string;
}

/* ───────────────── DADOS DA EMPRESA ───────────────── */
const COMPANY_DATA = {
  name: "Insecta Dedetizadora LTDA",
  cnpj: "53.921.773/0001-77",
  address: "Rua das hortênsias, Bairro Cascata, 25",
  phone: "47 99755-5271 / 47 9907-7520",
  email: "OCBM@OUTLOOK.COM.BR",
  technical_responsible: {
    name: "Filipe Antônio Kroll",
    title: "Engenheiro Ambiental e Sanitarista",
    registry: "CREA/SC: 181022-2",
  },
  applicator: {
    name: "Darlan Antonio Rempalski",
    cnpj: "53.921.773/0001-77",
  },
  license: "Licença Sanitária: N° 11/2025",
  logo_local: "/logo.png", // recomendado: arquivo local .png no /public
  logo_remote: "https://iili.io/KTFWdQ4.jpg", // fallback .jpg (sem querystring)
};
const getLogo = () => COMPANY_DATA.logo_local || COMPANY_DATA.logo_remote;

/* ───────────────── CORES ───────────────── */
const COLORS = {
  primary: "#111827", // preto (mais próximo do anexo)
  accent: "#c1121f", // vermelho discreto
  green: "#059669",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
};

/* ───────────────── ESTILOS ───────────────── */
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
    color: COLORS.gray[800],
  },

  /* Header genérico (usado na OS) */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  logoContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  logo: {
    width: 64,
    height: 64,
    marginRight: 12,
    objectFit: "contain",
    borderRadius: 6,
  },
  companySection: { flex: 1 },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  companyInfo: { fontSize: 9, color: COLORS.gray[600], lineHeight: 1.4 },
  orderSection: { alignItems: "flex-end" },
  orderNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  statusBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  viaLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.gray[700],
    textAlign: "right",
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: COLORS.gray[100],
    borderRadius: 5,
  },

  /* Sections / labels */
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoItem: { width: "50%", marginBottom: 6, paddingRight: 10 },
  infoItemFull: { width: "100%", marginBottom: 6 },
  label: {
    fontSize: 8,
    fontWeight: "bold",
    color: COLORS.gray[600],
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: { fontSize: 10, color: COLORS.gray[800] },

  /* Tabela padrão (OS) */
  table: { marginTop: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: 8,
  },
  tableHeaderText: {
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRowAlt: { backgroundColor: COLORS.gray[50] },
  tableCell: {
    fontSize: 8,
    color: COLORS.gray[700],
    textAlign: "center",
    paddingHorizontal: 4,
  },
  productDetails: {
    fontSize: 7,
    color: COLORS.gray[500],
    fontStyle: "italic",
    marginTop: 2,
  },

  /* Observações */
  notesText: {
    fontSize: 10,
    color: COLORS.gray[700],
    lineHeight: 1.5,
    textAlign: "justify",
    backgroundColor: COLORS.gray[50],
    padding: 12,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },

  /* Assinaturas (OS) */
  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signatureBox: {
    width: "48%",
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.gray[50],
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  signatureImage: {
    width: "100%",
    height: 40,
    objectFit: "contain",
    marginBottom: 10,
  },
  signatureName: {
    fontSize: 9,
    color: COLORS.gray[700],
    textAlign: "center",
    fontWeight: "bold",
  },
  signatureRegistry: {
    fontSize: 8,
    color: COLORS.gray[500],
    textAlign: "center",
    marginTop: 2,
  },
  signatureLine: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[400],
    paddingTop: 5,
  },

  /* ───────── Estilos específicos do CERTIFICADO ───────── */
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    letterSpacing: 1.2,
    fontWeight: 700,
    color: COLORS.primary,
  },
  headerDivider: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginBottom: 10,
  },
  headerLogo: { width: 56, height: 56, objectFit: "contain" },

  twoCols: { flexDirection: "row" },
  col: { flex: 1 },
  card: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  small: { fontSize: 9, color: COLORS.gray[700], lineHeight: 1.4 },

  certTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
    marginVertical: 14,
    color: COLORS.primary,
  },
  paragraph: {
    fontSize: 10,
    color: COLORS.gray[800],
    lineHeight: 1.5,
    textAlign: "justify",
    marginBottom: 10,
  },

  thRow: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: 6,
    marginTop: 6,
  },
  th: {
    color: "#fff",
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    textAlign: "center",
  },
  tdRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  td: {
    fontSize: 8,
    color: COLORS.gray[700],
    textAlign: "center",
    paddingHorizontal: 3,
  },
  tdNotes: {
    fontSize: 7,
    color: COLORS.gray[600],
    marginTop: 2,
    fontStyle: "italic",
  },

  inspRow: { flexDirection: "row", marginTop: 6 },
  inspCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  inspGap: { marginLeft: 6 },
  inspDate: { fontSize: 10, fontWeight: 700, marginBottom: 12 },
  inspSign: {
    fontSize: 9,
    color: COLORS.gray[600],
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[300],
    width: "100%",
    textAlign: "center",
    paddingTop: 4,
  },

  sigs: { flexDirection: "row", marginTop: 14 },
  sigBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    padding: 10,
    minHeight: 92,
  },
  sigGap: { marginLeft: 12 },
  sigTitle: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 10,
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[400],
    marginTop: 26,
    paddingTop: 4,
    textAlign: "center",
    fontSize: 9,
  },
  sigSub: { textAlign: "center", fontSize: 8, color: COLORS.gray[600] },

  footerCenter: { marginTop: 18, alignItems: "center" },
  license: { fontSize: 11, fontWeight: 700 },

  // watermark (opcional; se o renderer ignorar opacity, não quebra)
  wm: {
    position: "absolute",
    top: 220,
    left: 120,
    width: 320,
    height: 320,
    opacity: 0.06,
  },

  // Footer (OS)
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  footerText: { fontSize: 8, color: COLORS.gray[500] },

  // QR Code (OS)
  qrSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gray[50],
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginTop: 20,
  },
  qrCode: { width: 60, height: 60, marginRight: 15 },
  qrText: { flex: 1 },
  qrTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  qrUrl: { fontSize: 8, color: COLORS.gray[600] },
});

/* ───────────────── UTILITÁRIOS ───────────────── */
const formatDate = (dateString?: string | null) => {
  if (!dateString) return "–";
  try {
    return new Date(dateString).toLocaleDateString("pt-BR");
  } catch {
    return "–";
  }
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return "–";
  try {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "–";
  }
};

const safeFileName = (s?: string | null) =>
  (s || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const generateQRCode = (data: string): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    data
  )}`;

/** soma meses (sem libs) */
const addMonths = (iso?: string | null, months = 0) => {
  const d = iso ? new Date(iso) : new Date();
  const day = d.getDate();
  const out = new Date(d);
  out.setMonth(d.getMonth() + months);
  if (out.getDate() < day) out.setDate(0);
  return out.toISOString();
};

const inferServiceType = (items?: PrintableData["items"]) => {
  const txt = (items || [])
    .map((i) => i?.pest || "")
    .join(" ")
    .toLowerCase();
  if (txt.includes("cupin") || txt.includes("broca")) return "DESCUPINIZAÇÃO";
  return "DEDETIZAÇÃO";
};

/* ───────────────── PÁGINA DA ORDEM (vias) ───────────────── */
const ServiceOrderPage: React.FC<{
  data: PrintableData;
  viaIndex: number;
  isLastPage?: boolean;
}> = ({ data, viaIndex, isLastPage = false }) => {
  const viaLabels = ["VIA DO CLIENTE", "VIA DA EMPRESA"];
  const viaLabel = viaLabels[viaIndex - 1] || `VIA ${viaIndex}`;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.viaLabel}>{viaLabel}</Text>

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image src={getLogo()} style={styles.logo} />
          <View style={styles.companySection}>
            <Text style={styles.companyName}>{COMPANY_DATA.name}</Text>
            <Text style={styles.companyInfo}>
              CNPJ: {COMPANY_DATA.cnpj}
              {"\n"}
              {COMPANY_DATA.address}
              {"\n"}
              Telefone: {COMPANY_DATA.phone}
              {"\n"}
              E-mail: {COMPANY_DATA.email}
              {"\n"}
              {COMPANY_DATA.license}
            </Text>
          </View>
        </View>
        <View style={styles.orderSection}>
          <Text style={styles.orderNumber}>
            {data?.order?.public_code || "–"}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {data?.order?.status_text || "EXECUTADO"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações da Ordem de Serviço</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Data de Criação</Text>
            <Text style={styles.value}>
              {formatDateTime(data?.order?.created_at)}
            </Text>
          </View>
          {data?.order?.scheduled_at && (
            <View style={styles.infoItem}>
              <Text style={styles.label}>Data Agendada</Text>
              <Text style={styles.value}>
                {formatDateTime(data.order.scheduled_at)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados do Cliente</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>{data?.client?.name || "–"}</Text>
          </View>
          {data?.client?.doc && (
            <View style={styles.infoItem}>
              <Text style={styles.label}>Documento</Text>
              <Text style={styles.value}>{data.client.doc}</Text>
            </View>
          )}
          {data?.client?.phone && (
            <View style={styles.infoItem}>
              <Text style={styles.label}>Telefone</Text>
              <Text style={styles.value}>{data.client.phone}</Text>
            </View>
          )}
          {data?.client?.email && (
            <View style={styles.infoItem}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{data.client.email}</Text>
            </View>
          )}
          {data?.client?.address && (
            <View style={styles.infoItemFull}>
              <Text style={styles.label}>Endereço</Text>
              <Text style={styles.value}>{data.client.address}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Responsável Técnico</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>
              {COMPANY_DATA.technical_responsible.name}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Registro</Text>
            <Text style={styles.value}>
              {COMPANY_DATA.technical_responsible.registry}
            </Text>
          </View>
          <View style={styles.infoItemFull}>
            <Text style={styles.label}>Qualificação</Text>
            <Text style={styles.value}>
              {COMPANY_DATA.technical_responsible.title}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicador</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>{COMPANY_DATA.applicator.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>CNPJ</Text>
            <Text style={styles.value}>{COMPANY_DATA.applicator.cnpj}</Text>
          </View>
        </View>
      </View>

      {data?.items && data.items.length > 0 && (
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Produtos Aplicados</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: "20%" }]}>
                Praga
              </Text>
              <Text style={[styles.tableHeaderText, { width: "30%" }]}>
                Produto
              </Text>
              <Text style={[styles.tableHeaderText, { width: "20%" }]}>
                Aplicação
              </Text>
              <Text style={[styles.tableHeaderText, { width: "15%" }]}>
                Diluição
              </Text>
              <Text style={[styles.tableHeaderText, { width: "15%" }]}>
                Quantidade
              </Text>
            </View>

            {data.items.map((item, index) => (
              <View
                key={index}
                style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
              >
                <View style={{ width: "20%" }}>
                  <Text style={styles.tableCell}>{item?.pest || "–"}</Text>
                </View>

                <View style={{ width: "30%" }}>
                  <Text style={styles.tableCell}>{item?.product || "–"}</Text>
                  {item?.registration_ms && (
                    <Text style={styles.productDetails}>
                      Reg. MS: {item.registration_ms}
                    </Text>
                  )}
                  {item?.composition && (
                    <Text style={styles.productDetails}>
                      Composição: {item.composition}
                    </Text>
                  )}
                  {item?.group_chemical && (
                    <Text style={styles.productDetails}>
                      Grupo: {item.group_chemical}
                    </Text>
                  )}
                </View>

                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {item?.application || "–"}
                </Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {item?.dilution || "–"}
                </Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {String(item?.quantity ?? "–")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {data?.order?.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <Text style={styles.notesText}>{data.order.notes}</Text>
        </View>
      )}

      <View style={styles.signaturesContainer} wrap={false}>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>Técnico Responsável</Text>
          {data?.technicians?.[0]?.signature_url && (
            <Image
              src={data.technicians[0].signature_url}
              style={styles.signatureImage}
            />
          )}
          <Text style={styles.signatureName}>
            {data?.technicians?.[0]?.name ||
              COMPANY_DATA.technical_responsible.name}
          </Text>
          <Text style={styles.signatureRegistry}>
            {data?.technicians?.[0]?.registry ||
              COMPANY_DATA.technical_responsible.registry}
          </Text>
          {!data?.technicians?.[0]?.signature_url && (
            <View style={styles.signatureLine} />
          )}
        </View>

        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>Cliente</Text>
          <View style={styles.signatureLine} />
          {data?.client_signature && (
            <>
              <Text style={styles.signatureName}>
                {data.client_signature.name || "–"}
              </Text>
              {data.client_signature.cpf && (
                <Text style={styles.signatureRegistry}>
                  CPF: {data.client_signature.cpf}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {data?.validation_url && (
        <View style={styles.qrSection}>
          <Image
            src={generateQRCode(data.validation_url)}
            style={styles.qrCode}
          />
          <View style={styles.qrText}>
            <Text style={styles.qrTitle}>Validação do Documento</Text>
            <Text style={styles.qrUrl}>{data.validation_url}</Text>
          </View>
        </View>
      )}

      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          Gerado em:{" "}
          {formatDateTime(data?.generated_at || new Date().toISOString())}
        </Text>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </View>
    </Page>
  );
};

/* ───────────────── PÁGINA DO CERTIFICADO ───────────────── */
const CertificatePage: React.FC<{ data: PrintableData }> = ({ data }) => {
  const items = (data.items || []) as NonNullable<PrintableData["items"]>;

  const maxGarantia = Math.max(
    0,
    ...items
      .map((i) => parseInt(String(i?.garantia || "0"), 10))
      .filter((n) => isFinite(n))
  );

  const pragas =
    items
      .map((i) => i?.pest)
      .filter(Boolean)
      .join(", ") || "–";
  const methods =
    (data.certificate?.methods && data.certificate.methods.length > 0
      ? data.certificate.methods
      : Array.from(
          new Set(
            items.map((i) => (i?.application || "").trim()).filter(Boolean)
          )
        )
    ).join(" / ") || "–";

  const base =
    data.order?.scheduled_at ||
    data.order?.created_at ||
    new Date().toISOString();
  const validityMonths = data.certificate?.validity_months ?? 24;
  const validUntil =
    data.certificate?.valid_until || addMonths(base, validityMonths);
  const inspections =
    data.certificate?.inspections ||
    [6, 12, 18, 24].map((m) => addMonths(base, m));
  const issueCity =
    data.certificate?.issue_city || data.client?.city || "Campo Alegre";
  const serviceType = data.certificate?.service_type || inferServiceType(items);

  return (
    <Page size="A4" style={styles.page}>
      {/* Watermark opcional */}
      <Image src={getLogo()} style={styles.wm} />

      {/* Cabeçalho com marca e logo */}
      <View style={styles.topHeader}>
        <Text style={styles.brandTitle}>INSECTA DEDETIZADORA</Text>
        <Image src={getLogo()} style={styles.headerLogo} />
      </View>
      <View style={styles.headerDivider} />

      {/* Quadro cliente + validade */}
      <View style={styles.twoCols}>
        <View style={styles.col}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cliente</Text>
            <Text style={styles.small}>{data?.client?.name || "–"}</Text>
            {data?.client?.doc && (
              <Text style={styles.small}>CNPJ/CPF: {data.client.doc}</Text>
            )}
            {data?.client?.address && (
              <Text style={styles.small}>Endereço: {data.client.address}</Text>
            )}
            {(data?.client?.city || data?.client?.zip) && (
              <Text style={styles.small}>
                Cidade/CEP:{" "}
                {[data.client?.city, data.client?.zip]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>
            )}
            <Text style={[styles.small, { marginTop: 6 }]}>
              Validade do certificado:{" "}
              {String((validityMonths / 12).toFixed(0))} ano(s) (
              {formatDate(validUntil)})
            </Text>
          </View>
        </View>

        <View style={styles.col}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Empresa</Text>
            <Text style={styles.small}>{COMPANY_DATA.name}</Text>
            <Text style={styles.small}>CNPJ: {COMPANY_DATA.cnpj}</Text>
            <Text style={styles.small}>{COMPANY_DATA.address}</Text>
            <Text style={styles.small}>Telefone: {COMPANY_DATA.phone}</Text>
            <Text style={styles.small}>E-mail: {COMPANY_DATA.email}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.certTitle}>CERTIFICADO</Text>

      {/* Texto institucional */}
      <Text style={styles.paragraph}>
        A empresa {COMPANY_DATA.name}, devidamente licenciada e legalmente
        habilitada, certifica que realizou o serviço de{" "}
        {serviceType?.toLowerCase()} no endereço acima mencionado, com a
        finalidade de controle e eliminação de pragas, garantindo a proteção
        estrutural do imóvel e a segurança dos ocupantes, em conformidade com as
        normas técnicas e sanitárias vigentes. Período de execução do serviço:
        realizado em {String(data.certificate?.execution_days ?? 5)} dia(s)
        distintos, respeitando as normas técnicas e de segurança.
      </Text>

      <Text style={styles.sectionTitle}>Pragas controladas</Text>
      <Text style={{ fontSize: 10 }}>{pragas}</Text>

      <Text style={styles.sectionTitle}>Método de aplicação</Text>
      <Text style={{ fontSize: 10 }}>{methods}</Text>

      {/* Produtos / Regulatórios */}
      {items.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Produtos</Text>
          <View>
            <View style={styles.thRow}>
              <Text style={[styles.th, { width: "32%" }]}>Produto</Text>
              <Text style={[styles.th, { width: "18%" }]}>Registro MS</Text>
              <Text style={[styles.th, { width: "20%" }]}>Grupo Químico</Text>
              <Text style={[styles.th, { width: "30%" }]}>
                Antídoto / Telefone
              </Text>
            </View>
            {items.map((it, i) => (
              <View key={i} style={styles.tdRow}>
                <View style={{ width: "32%" }}>
                  <Text style={styles.td}>{it?.product || "–"}</Text>
                  {it?.composition && (
                    <Text style={styles.tdNotes}>
                      Composição: {it.composition}
                    </Text>
                  )}
                </View>
                <Text style={[styles.td, { width: "18%" }]}>
                  {it?.registration_ms || "–"}
                </Text>
                <Text style={[styles.td, { width: "20%" }]}>
                  {it?.group_chemical || "–"}
                </Text>
                <View style={{ width: "30%" }}>
                  <Text style={styles.td}>
                    {it?.antidote ||
                      "Anti-histamínicos e tratamento sintomático"}
                  </Text>
                  {it?.emergency_phone && (
                    <Text style={styles.tdNotes}>
                      Emergência: {it.emergency_phone}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Observação de validade */}
      <Text style={{ fontSize: 9, color: COLORS.gray[700], marginTop: 8 }}>
        OBS: Este certificado tem validade de{" "}
        {String((validityMonths / 12).toFixed(0))} ano(s) (
        {formatDate(validUntil)}).
      </Text>

      {/* Local e data */}
      <Text style={{ fontSize: 11, textAlign: "center", marginTop: 12 }}>
        {issueCity}
        {issueCity ? ", " : ""}
        {formatDate(data?.order?.scheduled_at)}
      </Text>

      {/* Inspeções (4 colunas) */}
      {inspections.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Inspeções</Text>
          <View style={styles.inspRow}>
            {inspections.slice(0, 4).map((iso, i) => (
              <View
                key={i}
                style={[styles.inspCell, i > 0 ? styles.inspGap : undefined]}
              >
                <Text style={styles.inspDate}>{formatDate(iso)}</Text>
                <Text style={styles.inspSign}>Assinatura</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Assinaturas */}
      <View style={styles.sigs}>
        <View style={styles.sigBox}>
          <Text style={styles.sigTitle}>RESPONSÁVEL TÉCNICO</Text>
          <Text style={styles.sigLine}>
            {COMPANY_DATA.technical_responsible.name}
          </Text>
          <Text style={styles.sigSub}>
            {COMPANY_DATA.technical_responsible.title} —{" "}
            {COMPANY_DATA.technical_responsible.registry}
          </Text>
        </View>
        <View style={[styles.sigBox, styles.sigGap]}>
          <Text style={styles.sigTitle}>INSECTA DEDETIZADORA LTDA</Text>
          <Text style={styles.sigLine}>{COMPANY_DATA.applicator.name}</Text>
          <Text style={styles.sigSub}>
            CNPJ: {COMPANY_DATA.applicator.cnpj}
          </Text>
        </View>
      </View>

      {/* Licença ao centro */}
      <View style={styles.footerCenter}>
        <Text style={styles.license}>{COMPANY_DATA.license}</Text>
        <Text style={{ fontSize: 8, color: COLORS.gray[600], marginTop: 4 }}>
          Gerado em{" "}
          {formatDateTime(data?.generated_at || new Date().toISOString())}
        </Text>
      </View>
    </Page>
  );
};

/* ───────────────── DOCUMENTO ───────────────── */
const ServiceOrderDocument: React.FC<{
  data: PrintableData;
  copies?: number;
  includeCertificate?: boolean;
}> = ({ data, copies = 2, includeCertificate = false }) => {
  const pages: React.ReactNode[] = [];

  for (let i = 1; i <= copies; i++) {
    pages.push(
      <ServiceOrderPage
        key={`via-${i}`}
        data={data}
        viaIndex={i}
        isLastPage={i === copies && !includeCertificate}
      />
    );
  }

  if (includeCertificate) {
    pages.push(<CertificatePage key="certificate" data={data} />);
  }

  return (
    <Document
      title={`OS ${data?.order?.public_code || ""}`}
      author={COMPANY_DATA.name}
      subject="Ordem de Serviço"
    >
      {pages}
    </Document>
  );
};

/* ───────────────── DOWNLOAD ───────────────── */
export const downloadServiceOrderPdf = async (
  data: PrintableData,
  options: { copies?: number; includeCertificate?: boolean } = {}
) => {
  const { copies = 2, includeCertificate = false } = options;

  const enrichedData: PrintableData = {
    ...data,
    generated_at: data.generated_at || new Date().toISOString(),
  };

  const blob = await pdf(
    <ServiceOrderDocument
      data={enrichedData}
      copies={copies}
      includeCertificate={includeCertificate}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const osCode = safeFileName(data?.order?.public_code);
  const clientName = safeFileName(data?.client?.name);
  const fileName = `OS_${osCode}${clientName ? `_${clientName}` : ""}.pdf`;

  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* ───────────────── HOOK ───────────────── */
export const useServiceOrderPDF = () => {
  const generatePDF = (
    data: PrintableData,
    options?: { copies?: number; includeCertificate?: boolean }
  ) => downloadServiceOrderPdf(data, options);

  return { generatePDF };
};

export default ServiceOrderDocument;
