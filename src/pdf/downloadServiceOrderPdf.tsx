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
    emergency_phone?: string;
    garantia?: string;
  }>;
  technicians?: Array<{
    name?: string;
    registry?: string;
    signature_url?: string;
  }>;
  client_signature?: { name?: string; cpf?: string };
  certificate?: {
    service_type?: string;
    issue_city?: string;
    execution_days?: number;
    execution_note?: string;
    validity_months?: number;
    valid_until?: string; // ISO
    methods?: string[];
    inspections?: string[]; // ISO dates
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
  license: "Licença Sanitária: N° 11/2025",
  technical_responsible: {
    name: "Filipe Antônio Kroll",
    title: "Engenheiro Ambiental e Sanitarista",
    registry: "CREA/SC: 181022-2",
  },
  applicator: { name: "Darlan Antonio Rempalski", cnpj: "53.921.773/0001-77" },
  logo_remote: "https://iili.io/KTFWdQ4.jpg",
};

const resolveLogo = (override?: string) => {
  const cands = [
    override,
    COMPANY_DATA.logo_local,
    COMPANY_DATA.logo_remote,
  ].filter(Boolean) as string[];
  const ok = cands.find((u) => /\.(png|jpe?g)$/i.test(u));
  return ok || "/logo.jpg"; // mantenha um fallback em /public
};

/* ───────────────── THEME ───────────────── */
const THEME = {
  font: "Helvetica",
  text: "#0f172a", // slate-900
  mute: "#475569", // slate-600
  border: "#e5e7eb",
  bg: "#ffffff",
  bgAlt: "#f8fafc", // slate-50
  primary: "#1e40af", // indigo-800
  primarySoft: "#dbeafe", // indigo-100
  success: "#059669",
  danger: "#b91c1c",
  warning: "#a16207",
};

/* ───────────────── UTILS ───────────────── */
const fmtDate = (iso?: string | null) => {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "–";
  }
};
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
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
const generateQRCode = (data: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    data
  )}`;
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

const statusColor = (s?: string) => {
  const up = (s || "").toUpperCase();
  if (up.includes("CANCEL")) return THEME.danger;
  if (up.includes("ABER") || up.includes("AGUARD")) return THEME.warning;
  if (up.includes("EXEC")) return THEME.success;
  return THEME.primary;
};

/* ───────────────── STYLES ───────────────── */
const S = StyleSheet.create({
  page: {
    fontFamily: THEME.font,
    fontSize: 10,
    padding: 28,
    color: THEME.text,
    backgroundColor: THEME.bg,
  },

  header: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  headerLeft: {
    width: 92,
    backgroundColor: THEME.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  logo: { width: 68, height: 68 },
  headerRight: { flex: 1, backgroundColor: THEME.primary, padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: 700 },
  subtitle: { color: "#e0e7ff", fontSize: 10, marginTop: 2 },

  chipRow: { flexDirection: "row", marginTop: 6, flexWrap: "wrap" },
  chip: {
    fontSize: 9,
    color: THEME.primary,
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 6,
    marginTop: 4,
  },
  chipStatus: {
    fontSize: 9,
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
  },

  box: {
    backgroundColor: THEME.bgAlt,
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "solid",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: THEME.primary,
    marginTop: 12,
    marginBottom: 6,
  },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  col: { width: "50%", paddingRight: 8, marginBottom: 8 },
  colFull: { width: "100%", marginBottom: 8 },
  label: {
    fontSize: 8,
    fontWeight: 700,
    color: THEME.mute,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: { fontSize: 10 },

  table: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "solid",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  thead: { flexDirection: "row", backgroundColor: THEME.primary },
  th: {
    color: "#fff",
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    textAlign: "center",
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    borderTopStyle: "solid",
  },
  rowAlt: { backgroundColor: THEME.bgAlt },
  td: {
    fontSize: 8.5,
    color: THEME.text,
    textAlign: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tdNotes: {
    fontSize: 7,
    color: THEME.mute,
    marginTop: 2,
    textAlign: "left",
    fontStyle: "italic",
  },

  notes: {
    fontSize: 10,
    color: THEME.text,
    lineHeight: 1.5,
    textAlign: "justify",
    backgroundColor: THEME.bgAlt,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: THEME.primary,
    marginTop: 6,
  },

  sigs: { flexDirection: "row", marginTop: 16 },
  sigBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: THEME.bgAlt,
  },
  sigGap: { marginLeft: 12 },
  sigTitle: {
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 10,
    textTransform: "uppercase",
    color: THEME.primary,
  },
  sigImg: { width: "100%", height: 40, marginBottom: 10 },
  sigName: { fontSize: 9, textAlign: "center", fontWeight: 700 },
  sigSub: { fontSize: 8, textAlign: "center", color: THEME.mute, marginTop: 2 },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    marginTop: 24,
    paddingTop: 4,
    textAlign: "center",
    fontSize: 9,
  },

  qr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.bgAlt,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 12,
  },
  qrImg: { width: 64, height: 64, marginRight: 12 },
  qrTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: THEME.primary,
    marginBottom: 2,
  },
  qrUrl: { fontSize: 8, color: THEME.mute },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  footerText: { fontSize: 8, color: THEME.mute },

  // CERTIFICADO
  wm: {
    position: "absolute",
    top: 220,
    left: 120,
    width: 320,
    height: 320,
    opacity: 0.06,
  },
  certBrand: {
    fontSize: 22,
    letterSpacing: 1.2,
    fontWeight: 700,
    color: THEME.primary,
  },
  certTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  certLogo: { width: 56, height: 56 },
  divider: { height: 2, backgroundColor: THEME.primary, marginBottom: 10 },
  cardsRow: { flexDirection: "row" },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
  },
  cardLast: { marginRight: 0 },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    color: THEME.primary,
  },
  small: { fontSize: 9, color: THEME.text, lineHeight: 1.4 },
  certTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
    color: THEME.primary,
    marginVertical: 12,
  },
});

/* ───────────────── COMPONENTES ───────────────── */
const Chip = ({ children }: { children: React.ReactNode }) => (
  <Text style={S.chip}>{children}</Text>
);
const KV = ({ label, value }: { label: string; value?: any }) => (
  <View style={{ marginBottom: 4 }}>
    <Text style={S.label}>{label}</Text>
    <Text style={S.value}>{value ?? "–"}</Text>
  </View>
);

/* ───────────────── PÁGINA DA ORDEM (VIA) ───────────────── */
const ServiceOrderPage: React.FC<{ data: PrintableData; viaIndex: number }> = ({
  data,
  viaIndex,
}) => {
  const viaLabels = ["VIA DO CLIENTE", "VIA DA EMPRESA"];
  const viaLabel = viaLabels[viaIndex - 1] || `VIA ${viaIndex}`;
  const logoSrc = resolveLogo();
  const stColor = statusColor(data?.order?.status_text);

  return (
    <Page size="A4" style={S.page}>
      {/* Cabeçalho colorido */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          {logoSrc ? <Image src={logoSrc} style={S.logo} /> : null}
        </View>
        <View style={S.headerRight}>
          <Text style={S.title}>ORDEM DE SERVIÇO</Text>
          <Text style={S.subtitle}>{COMPANY_DATA.name}</Text>
          <View style={S.chipRow}>
            <Chip>Código: {data?.order?.public_code || "–"}</Chip>
            <Chip>Criação: {fmtDateTime(data?.order?.created_at)}</Chip>
            {data?.order?.scheduled_at ? (
              <Chip>Agendada: {fmtDateTime(data.order.scheduled_at)}</Chip>
            ) : null}
            <Text
              style={[
                S.chipStatus,
                { backgroundColor: stColor, marginLeft: 6 },
              ]}
            >
              {" "}
              {data?.order?.status_text || "EXECUTADO"}{" "}
            </Text>
            <Chip>{viaLabel}</Chip>
          </View>
        </View>
      </View>

      {/* Empresa / Cliente */}
      <View style={S.box}>
        <View style={S.grid}>
          <View style={S.col}>
            <KV label="Empresa" value={COMPANY_DATA.name} />
          </View>
          <View style={S.col}>
            <KV label="CNPJ" value={COMPANY_DATA.cnpj} />
          </View>
          <View style={S.col}>
            <KV label="Endereço" value={COMPANY_DATA.address} />
          </View>
          <View style={S.col}>
            <KV
              label="Contato"
              value={[COMPANY_DATA.phone, COMPANY_DATA.email]
                .filter(Boolean)
                .join(" • ")}
            />
          </View>
          <View style={S.col}>
            <KV label="Cliente" value={data?.client?.name} />
          </View>
          <View style={S.col}>
            <KV label="CNPJ/CPF" value={data?.client?.doc} />
          </View>
          <View style={S.colFull}>
            <KV label="Endereço do Cliente" value={data?.client?.address} />
          </View>
          <View style={S.col}>
            <KV
              label="Cidade/UF • CEP"
              value={[data?.client?.city, data?.client?.zip]
                .filter(Boolean)
                .join(" • ")}
            />
          </View>
          <View style={S.col}>
            <KV
              label="Telefone / E-mail"
              value={[data?.client?.phone, data?.client?.email]
                .filter(Boolean)
                .join(" • ")}
            />
          </View>
        </View>
      </View>

      {/* Tabela de Produtos */}
      {Array.isArray(data?.items) && data!.items!.length > 0 && (
        <View style={S.box} wrap>
          <Text style={S.sectionTitle}>Produtos Aplicados</Text>
          <View style={S.table}>
            <View style={S.thead}>
              <Text style={[S.th, { width: "20%" }]}>Praga</Text>
              <Text style={[S.th, { width: "30%" }]}>Produto</Text>
              <Text style={[S.th, { width: "18%" }]}>Aplicação</Text>
              <Text style={[S.th, { width: "16%" }]}>Diluição</Text>
              <Text style={[S.th, { width: "16%" }]}>Quantidade</Text>
            </View>
            {data!.items!.map((it, i) => (
              <View key={i} style={[S.row, i % 2 ? S.rowAlt : undefined]}>
                <Text style={[S.td, { width: "20%" }]}>{it?.pest || "–"}</Text>
                <View style={{ width: "30%", paddingHorizontal: 4 }}>
                  <Text
                    style={[S.td, { textAlign: "left", paddingHorizontal: 0 }]}
                  >
                    {it?.product || "–"}
                  </Text>
                  {it?.registration_ms ? (
                    <Text style={S.tdNotes}>Reg. MS: {it.registration_ms}</Text>
                  ) : null}
                  {it?.composition ? (
                    <Text style={S.tdNotes}>Composição: {it.composition}</Text>
                  ) : null}
                  {it?.group_chemical ? (
                    <Text style={S.tdNotes}>Grupo: {it.group_chemical}</Text>
                  ) : null}
                  {it?.recommended_dilution ? (
                    <Text style={S.tdNotes}>
                      Recomend.: {it.recommended_dilution}
                    </Text>
                  ) : null}
                  {it?.toxicity_action ? (
                    <Text style={S.tdNotes}>Toxic.: {it.toxicity_action}</Text>
                  ) : null}
                  {it?.antidote ? (
                    <Text style={S.tdNotes}>Antídoto: {it.antidote}</Text>
                  ) : null}
                  {it?.emergency_phone ? (
                    <Text style={S.tdNotes}>Emerg.: {it.emergency_phone}</Text>
                  ) : null}
                </View>
                <Text style={[S.td, { width: "18%" }]}>
                  {it?.application || "–"}
                </Text>
                <Text style={[S.td, { width: "16%" }]}>
                  {it?.dilution || "–"}
                </Text>
                <Text style={[S.td, { width: "16%" }]}>
                  {String(it?.quantity ?? "–")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Observações */}
      {data?.order?.notes ? (
        <View style={S.box}>
          <Text style={S.sectionTitle}>Observações</Text>
          <Text style={S.notes}>{data.order.notes}</Text>
        </View>
      ) : null}

      {/* Assinaturas */}
      <View style={S.sigs} wrap={false}>
        <View style={S.sigBox}>
          <Text style={S.sigTitle}>Técnico Responsável</Text>
          {data?.technicians?.[0]?.signature_url ? (
            <Image src={data.technicians[0].signature_url!} style={S.sigImg} />
          ) : null}
          <Text style={S.sigName}>
            {data?.technicians?.[0]?.name ||
              COMPANY_DATA.technical_responsible.name}
          </Text>
          <Text style={S.sigSub}>
            {data?.technicians?.[0]?.registry ||
              COMPANY_DATA.technical_responsible.registry}
          </Text>
          {!data?.technicians?.[0]?.signature_url ? (
            <Text style={S.sigLine}> assinatura </Text>
          ) : null}
        </View>
        <View style={[S.sigBox, S.sigGap]}>
          <Text style={S.sigTitle}>Cliente</Text>
          <Text style={S.sigLine}>{data?.client_signature?.name || " "}</Text>
          {data?.client_signature?.cpf ? (
            <Text style={S.sigSub}>CPF: {data.client_signature.cpf}</Text>
          ) : null}
        </View>
      </View>

      {/* Validação (QR) */}
      {data?.validation_url ? (
        <View style={S.qr}>
          <Image src={generateQRCode(data.validation_url)} style={S.qrImg} />
          <View style={{ flex: 1 }}>
            <Text style={S.qrTitle}>Validação do Documento</Text>
            <Text style={S.qrUrl}>{data.validation_url}</Text>
          </View>
        </View>
      ) : null}

      {/* Footer */}
      <View style={S.footer} fixed>
        <Text style={S.footerText}>
          Gerado em:{" "}
          {fmtDateTime(data?.generated_at || new Date().toISOString())}
        </Text>
        <Text
          style={S.footerText}
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
  const pragas =
    items
      .map((i) => i?.pest)
      .filter(Boolean)
      .join(", ") || "–";
  const methods =
    (data.certificate?.methods?.length
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
  const logoSrc = resolveLogo();

  return (
    <Page size="A4" style={S.page}>
      <Image src={logoSrc} style={S.wm} />
      <View style={S.certTop}>
        <Text style={S.certBrand}>{COMPANY_DATA.name.toUpperCase()}</Text>
        {logoSrc ? <Image src={logoSrc} style={S.certLogo} /> : null}
      </View>
      <View style={S.divider} />

      <View style={S.cardsRow}>
        <View style={S.card}>
          <Text style={S.cardTitle}>Cliente</Text>
          <Text style={S.small}>{data?.client?.name || "–"}</Text>
          {data?.client?.doc ? (
            <Text style={S.small}>CNPJ/CPF: {data.client.doc}</Text>
          ) : null}
          {data?.client?.address ? (
            <Text style={S.small}>Endereço: {data.client.address}</Text>
          ) : null}
          {data?.client?.city || data?.client?.zip ? (
            <Text style={S.small}>
              Cidade/CEP:{" "}
              {[data.client?.city, data.client?.zip]
                .filter(Boolean)
                .join(" • ")}
            </Text>
          ) : null}
          <Text style={[S.small, { marginTop: 6 }]}>
            Validade do certificado: {String((validityMonths / 12).toFixed(0))}{" "}
            ano(s) ({fmtDate(validUntil)})
          </Text>
        </View>
        <View style={[S.card, S.cardLast]}>
          <Text style={S.cardTitle}>Empresa</Text>
          <Text style={S.small}>{COMPANY_DATA.name}</Text>
          <Text style={S.small}>CNPJ: {COMPANY_DATA.cnpj}</Text>
          <Text style={S.small}>{COMPANY_DATA.address}</Text>
          <Text style={S.small}>Telefone: {COMPANY_DATA.phone}</Text>
          <Text style={S.small}>E-mail: {COMPANY_DATA.email}</Text>
        </View>
      </View>

      <Text style={S.certTitle}>CERTIFICADO</Text>
      <Text style={{ fontSize: 10, lineHeight: 1.5, textAlign: "justify" }}>
        A empresa {COMPANY_DATA.name}, devidamente licenciada, certifica que
        realizou o serviço de {serviceType.toLowerCase()} no endereço acima,
        conforme boas práticas e normas sanitárias. Período de execução:{" "}
        {String(data.certificate?.execution_days ?? 5)} dia(s).{" "}
        {data.certificate?.execution_note || ""}
      </Text>

      <Text style={S.sectionTitle}>Pragas controladas</Text>
      <Text style={{ fontSize: 10 }}>{pragas}</Text>

      <Text style={S.sectionTitle}>Método de aplicação</Text>
      <Text style={{ fontSize: 10 }}>{methods}</Text>

      {items.length > 0 ? (
        <View style={{ marginTop: 6 }}>
          <View style={S.thead}>
            <Text style={[S.th, { width: "34%" }]}>Produto</Text>
            <Text style={[S.th, { width: "18%" }]}>Registro MS</Text>
            <Text style={[S.th, { width: "18%" }]}>Grupo Químico</Text>
            <Text style={[S.th, { width: "30%" }]}>Antídoto / Telefone</Text>
          </View>
          {items.map((it, i) => (
            <View key={i} style={[S.row, i % 2 ? S.rowAlt : undefined]}>
              <View style={{ width: "34%", paddingHorizontal: 4 }}>
                <Text
                  style={[S.td, { textAlign: "left", paddingHorizontal: 0 }]}
                >
                  {it?.product || "–"}
                </Text>
                {it?.composition ? (
                  <Text style={S.tdNotes}>Composição: {it.composition}</Text>
                ) : null}
              </View>
              <Text style={[S.td, { width: "18%" }]}>
                {it?.registration_ms || "–"}
              </Text>
              <Text style={[S.td, { width: "18%" }]}>
                {it?.group_chemical || "–"}
              </Text>
              <View style={{ width: "30%" }}>
                <Text style={S.td}>
                  {it?.antidote || "Tratamento sintomático"}
                </Text>
                {it?.emergency_phone ? (
                  <Text style={S.tdNotes}>Emerg.: {it.emergency_phone}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={{ fontSize: 9, color: THEME.mute, marginTop: 6 }}>
        OBS: Este certificado tem validade de{" "}
        {String((validityMonths / 12).toFixed(0))} ano(s) ({fmtDate(validUntil)}
        ).
      </Text>
      <Text style={{ fontSize: 11, textAlign: "center", marginTop: 10 }}>
        {issueCity}
        {issueCity ? ", " : ""}
        {fmtDate(data?.order?.scheduled_at)}
      </Text>

      {inspections.length > 0 ? (
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {inspections.slice(0, 4).map((iso, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 8,
                padding: 8,
                alignItems: "center",
                marginLeft: i ? 6 : 0,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 12 }}>
                {fmtDate(iso)}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: THEME.mute,
                  marginTop: 18,
                  borderTopWidth: 1,
                  borderTopColor: THEME.border,
                  width: "100%",
                  textAlign: "center",
                  paddingTop: 4,
                }}
              >
                Assinatura
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <View style={[S.sigBox, { marginRight: 12 }]}>
          <Text style={S.sigTitle}>RESPONSÁVEL TÉCNICO</Text>
          <Text style={S.sigLine}>
            {COMPANY_DATA.technical_responsible.name}
          </Text>
          <Text style={S.sigSub}>
            {COMPANY_DATA.technical_responsible.title} —{" "}
            {COMPANY_DATA.technical_responsible.registry}
          </Text>
        </View>
        <View style={S.sigBox}>
          <Text style={S.sigTitle}>{COMPANY_DATA.name.toUpperCase()}</Text>
          <Text style={S.sigLine}>{COMPANY_DATA.applicator.name}</Text>
          <Text style={S.sigSub}>CNPJ: {COMPANY_DATA.applicator.cnpj}</Text>
        </View>
      </View>

      <View style={{ marginTop: 12, alignItems: "center" }}>
        <Text style={{ fontSize: 11, fontWeight: 700 }}>
          {COMPANY_DATA.license}
        </Text>
        <Text style={{ fontSize: 8, color: THEME.mute, marginTop: 4 }}>
          Gerado em{" "}
          {fmtDateTime(data?.generated_at || new Date().toISOString())}
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
  for (let i = 1; i <= copies; i++)
    pages.push(<ServiceOrderPage key={`via-${i}`} data={data} viaIndex={i} />);
  if (includeCertificate)
    pages.push(<CertificatePage key="certificate" data={data} />);

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
  const enriched: PrintableData = {
    ...data,
    generated_at: data.generated_at || new Date().toISOString(),
  };
  const blob = await pdf(
    <ServiceOrderDocument
      data={enriched}
      copies={copies}
      includeCertificate={includeCertificate}
    />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const osCode = safeFileName(data?.order?.public_code);
  const client = safeFileName(data?.client?.name);
  a.download = `OS_${osCode || ""}${client ? `_${client}` : ""}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/* ───────────────── HOOK ───────────────── */
export const useServiceOrderPDF = () => ({
  generatePDF: (
    data: PrintableData,
    options?: { copies?: number; includeCertificate?: boolean }
  ) => downloadServiceOrderPdf(data, options),
});

export default ServiceOrderDocument;
