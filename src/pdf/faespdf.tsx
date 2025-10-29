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
export type FaesPrintable = {
  faes: {
    id: number;
    public_code: string;
    schema_version: string;
    schema_title: string;
    finalized: boolean;
    submitted_at?: string | null;
    created_at?: string | null;
  };
  client: {
    id: number | null;
    name: string;
    doc?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  company?: {
    name?: string;
    cnpj?: string;
    address?: string;
    phones?: string[];
    email?: string;
    license_sanitaria?: string;
    cit?: string;
    responsible?: { name?: string; role?: string; crea?: string; uf?: string };
    applicator?: { name?: string; cnpj?: string };
    logo_url?: string;
  };
  data: Record<string, any>;
};

/* ───────────────── THEME ───────────────── */
const THEME = {
  font: "Helvetica",
  text: "#0f172a",
  mute: "#475569",
  bg: "#ffffff",
  bgAlt: "#f8fafc",
  border: "#e5e7eb",
  primary: "#1e40af",
  primarySoft: "#dbeafe",
  accent: "#0891b2",
  danger: "#b91c1c",
};

/* ───────────────── UTILS ───────────────── */
const safeJoin = (arr?: any[], sep = ", ") =>
  Array.isArray(arr) ? arr.filter(Boolean).join(sep) : "";

const isIsoDate = (s?: string | null) => {
  if (!s) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
};

const fmtDateBR = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
};

const addYearsBR = (iso?: string | null, years = 2) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    d.setFullYear(d.getFullYear() + years);
    return fmtDateBR(d.toISOString());
  } catch {
    return "";
  }
};

const addDaysBR = (iso?: string | null, days: number = 0) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + Number(days || 0));
    return fmtDateBR(d.toISOString());
  } catch {
    return "";
  }
};

/* ───────────────── STYLES ───────────────── */
const S = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: THEME.font,
    color: THEME.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  headerLeft: {
    width: 88,
    backgroundColor: THEME.primarySoft,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { width: 64, height: 64 },
  headerRight: { flex: 1, backgroundColor: THEME.primary, padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: 700 },
  subtitle: { color: "#e0e7ff", fontSize: 10, marginTop: 2 },

  chipRow: { flexDirection: "row", marginTop: 6 },
  chip: {
    fontSize: 9,
    color: THEME.primary,
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 6,
  },

  section: { marginTop: 10 },
  h2: { fontSize: 12, fontWeight: 700, color: THEME.primary, marginBottom: 6 },
  box: {
    backgroundColor: THEME.bgAlt,
    borderColor: THEME.border,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 6,
    padding: 8,
  },

  gridRow: { flexDirection: "row", marginBottom: 6 },
  gridCol: { flex: 1 },
  gap8: { marginRight: 8 },
  label: { fontSize: 9, color: THEME.mute },
  text: { fontSize: 10 },

  table: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
  },
  thead: { backgroundColor: THEME.primarySoft },
  tr: { flexDirection: "row" },
  th: {
    flex: 1,
    fontSize: 7.5,
    fontWeight: 700,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    borderRightStyle: "solid",
  },
  td: {
    flex: 1,
    fontSize: 7.5,
    padding: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    borderTopStyle: "solid",
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    borderRightStyle: "solid",
  },

  // Colunas específicas para tabela de produtos planejados
  colProduto: { flex: 1.2 },
  colGrupo: { flex: 0.9 },
  colRegistro: { flex: 1.1 },
  colDiluente: { flex: 0.6 },
  colQtd: { flex: 0.5 },
  colPraga: { flex: 1.3 },
  colEquip: { flex: 1.2 },
  colAntidoto: { flex: 1.5 },

  rowMuted: { backgroundColor: "#ffffff" },
  rowZebra: { backgroundColor: "#f1f5f9" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    textAlign: "center",
    color: THEME.mute,
    fontSize: 9,
  },

  signRow: { flexDirection: "row", marginTop: 10 },
  signCol: { flex: 1, marginRight: 8 },
  signLine: { marginTop: 18, marginBottom: 2, textAlign: "center" },
});

/* ───────────────── ATOMS ───────────────── */
const KV = ({ label, value }: { label: string; value?: any }) => (
  <View style={{ marginBottom: 4 }}>
    <Text style={S.label}>{label}</Text>
    <Text style={S.text}>{value ?? "—"}</Text>
  </View>
);

const Section = ({
  title,
  children,
  wrap = true,
}: {
  title: string;
  children?: React.ReactNode;
  wrap?: boolean;
}) => (
  <View style={S.section} wrap={wrap}>
    <Text style={S.h2}>{title}</Text>
    {children}
  </View>
);

/* ───────────────── DOC ───────────────── */
export function FAESPdfDoc({ printable }: { printable: FaesPrintable }) {
  const comp = printable.company || {};
  const d = printable?.data || {};

  // LOGO (com fallback e validação de extensão)
  const RAW_LOGO = d.logo_url || comp.logo_url || "https://iili.io/KTFWdQ4.jpg";
  const isValidImage =
    typeof RAW_LOGO === "string" && /\.(png|jpe?g)$/i.test(RAW_LOGO);
  const LOGO_SRC = isValidImage ? RAW_LOGO : "/logo.jpg";

  // ARRAYS
  const produtosPlanejados = Array.isArray(d.produtos_planejados)
    ? d.produtos_planejados
    : [];
  const produtosResumo = Array.isArray(d.produtos_resumo)
    ? d.produtos_resumo
    : [];
  const etapas = Array.isArray(d.procedimentos) ? d.procedimentos : [];
  const cronPrev = Array.isArray(d.cronograma_previsto)
    ? d.cronograma_previsto
    : [];
  const insp = Array.isArray(d.inspecoes_programadas)
    ? d.inspecoes_programadas
    : [];

  // MAPEAMENTO DE DEMANDA / CAMPOS NOVOS
  const mapeamento = d.mapeamento_demanda || {};
  const escopoServico: string =
    mapeamento.escopo ||
    d.escopo_servico ||
    d.objetivo ||
    "Estabelecer diretrizes para a execução do serviço, garantindo segurança e eficácia.";
  const produtosUtilizados: string[] =
    mapeamento.produtos_utilizados || d.produtos_utilizados || [];
  const cronogramaMapa: Array<{
    data?: string;
    atividade?: string;
    observacoes?: string;
  }> = mapeamento.cronograma || cronPrev;

  // Validade: prioriza DIAS; se 0/vazio, usa ANOS (com normalização)
  const diasRaw = Number(d.validade_certificado_dias);
  const validadeDiasNum =
    Number.isFinite(diasRaw) && diasRaw > 0 ? Math.floor(diasRaw) : 0;

  const anosRaw = Number(d.validade_certificado_anos);
  const validadeAnos =
    Number.isFinite(anosRaw) && anosRaw > 0 ? Math.ceil(anosRaw) : 2;

  // Base da validade: usa data_emissao; se inválida, tenta created_at; senão vazio
  const emissaoOk = isIsoDate(d.data_emissao) ? d.data_emissao : null;
  const createdOk = isIsoDate(printable.faes?.created_at)
    ? printable.faes?.created_at
    : null;
  const dataBase = emissaoOk || createdOk || "";

  const validadeAte =
    validadeDiasNum > 0
      ? addDaysBR(dataBase, validadeDiasNum)
      : addYearsBR(dataBase, validadeAnos);

  const validadeTexto =
    validadeDiasNum > 0
      ? `${validadeDiasNum} dia(s)`
      : `${validadeAnos} ano(s)`;

  const monitoramentoGarantia: string =
    d.monitoramento ??
    mapeamento.monitoramento ??
    `Garantia de ${validadeTexto}. Reinspeção periódica conforme contrato. Laudo técnico e certificado serão emitidos.`;

  const headerCompany = `${(
    comp.name || "Insecta Dedetizadora LTDA"
  ).toUpperCase()}`;
  const phones = (comp.phones || []).join(" / ");
  const cit = comp.cit || "0800 643 5252";
  const createdAt = printable.faes?.created_at || new Date().toISOString();

  /* ───────────────── PÁGINA 1 ───────────────── */
  const Page1 = (
    <Page size="A4" style={S.page}>
      <View style={S.header}>
        <View style={S.headerLeft}>
          {LOGO_SRC ? <Image src={LOGO_SRC} style={S.logo} /> : null}
        </View>
        <View style={S.headerRight}>
          <Text style={S.title}>
            FAES — Ficha Avaliativa de Execução do Serviço
          </Text>
          <Text style={S.subtitle}>{headerCompany}</Text>
          <View style={S.chipRow}>
            <Text style={S.chip}>
              Código:{" "}
              {printable.faes?.public_code ||
                `FAES-${printable.faes?.id ?? ""}`}
            </Text>
            <Text style={S.chip}>
              Emissão: {fmtDateBR(d.data_emissao || createdAt)}
            </Text>
            {printable.faes?.finalized ? (
              <Text style={S.chip}>FINALIZADA</Text>
            ) : (
              <Text style={S.chip}>RASCUNHO</Text>
            )}
          </View>
        </View>
      </View>

      <View style={[S.box]}>
        <View style={S.gridRow}>
          <View style={[S.gridCol, S.gap8]}>
            <KV
              label="Empresa"
              value={comp.name || "Insecta Dedetizadora LTDA"}
            />
          </View>
          <View style={S.gridCol}>
            <KV label="CNPJ" value={comp.cnpj || "53.921.773/0001-77"} />
          </View>
        </View>
        <View style={S.gridRow}>
          <View style={[S.gridCol, S.gap8]}>
            <KV label="Endereço" value={comp.address} />
          </View>
          <View style={S.gridCol}>
            <KV
              label="Contato"
              value={[phones, comp.email].filter(Boolean).join(" • ")}
            />
          </View>
        </View>
        <View style={S.gridRow}>
          <View style={[S.gridCol, S.gap8]}>
            <KV
              label="Cliente"
              value={d.cliente_nome || printable.client?.name}
            />
          </View>
          <View style={S.gridCol}>
            <KV
              label="CNPJ/CPF"
              value={d.cliente_cnpj || printable.client?.doc}
            />
          </View>
        </View>
        <View style={S.gridRow}>
          <View style={[S.gridCol, S.gap8]}>
            <KV
              label="Endereço do Cliente"
              value={d.cliente_endereco || printable.client?.address}
            />
          </View>
          <View style={S.gridCol}>
            <KV
              label="Cidade/UF • CEP"
              value={[d.cliente_cidade_uf, d.cliente_cep]
                .filter(Boolean)
                .join(" • ")}
            />
          </View>
        </View>
      </View>

      <Section title="Mapeamento de Demanda" wrap>
        <View style={S.box}>
          <Text style={S.text}>
            Este documento constitui o{" "}
            <Text style={{ fontWeight: 700 }}>MAPEAMENTO DE DEMANDA</Text>{" "}
            referente ao serviço avaliado e planejado, contendo escopo,
            cronograma, produtos e responsabilidades técnicas.
          </Text>
          <Text style={[S.text, { marginTop: 6 }]}>{escopoServico}</Text>
        </View>
      </Section>

      {produtosResumo.length > 0 ? (
        <Section
          title="Resumo de Produtos (Produto / Princípio ativo / Registro / Forma)"
          wrap
        >
          <View style={S.table}>
            <View style={[S.tr, S.thead]}>
              {[
                "Produto",
                "Princípio Ativo",
                "Registro ANVISA",
                "Forma de Aplicação",
              ].map((h, i) => (
                <Text
                  key={i}
                  style={[S.th, i === 3 && { borderRightWidth: 0 }]}
                >
                  {h}
                </Text>
              ))}
            </View>
            {produtosResumo.map((r: any, idx: number) => (
              <View key={idx} style={[S.tr, idx % 2 ? S.rowZebra : S.rowMuted]}>
                <Text style={S.td}>{r.produto}</Text>
                <Text style={S.td}>{r.principio_ativo}</Text>
                <Text style={S.td}>{r.registro_ms}</Text>
                <Text style={[S.td, { borderRightWidth: 0 }]}>
                  {r.forma_aplicacao}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Text
        style={S.footer}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  );

  /* ───────────────── PÁGINA 2 ───────────────── */
  const Page2 = (
    <Page size="A4" style={S.page}>
      <Section title="Procedimento Operacional Padrão (POP)">
        <View style={S.box}>
          {etapas.length === 0 ? (
            <Text style={S.text}>
              Avaliação prévia; Preparo dos produtos; Aplicação
              (injeção/barreira/pulverização); Finalização
              (sinalização/armazenamento); Registro; Segurança (EPIs e
              reentrada).
            </Text>
          ) : (
            etapas.map((e: any, i: number) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={[S.text, { fontWeight: 700 }]}>{e.titulo}</Text>
                <Text style={S.text}>{e.descricao}</Text>
              </View>
            ))
          )}
        </View>
      </Section>

      <Section title="Produtos Planejados">
        <View style={S.table}>
          <View style={[S.tr, S.thead]}>
            <Text style={[S.th, S.colProduto]}>Produto</Text>
            <Text style={[S.th, S.colGrupo]}>Grupo Químico</Text>
            <Text style={[S.th, S.colRegistro]}>Registro MS</Text>
            <Text style={[S.th, S.colDiluente]}>Diluente</Text>
            <Text style={[S.th, S.colQtd]}>Qtd</Text>
            <Text style={[S.th, S.colPraga]}>Praga Alvo</Text>
            <Text style={[S.th, S.colEquip]}>Equipamento</Text>
            <Text style={[S.th, S.colAntidoto, { borderRightWidth: 0 }]}>
              Antídoto
            </Text>
          </View>
          {produtosPlanejados.map((p: any, idx: number) => (
            <View key={idx} style={[S.tr, idx % 2 ? S.rowZebra : S.rowMuted]}>
              <Text style={[S.td, S.colProduto]}>{p.produto}</Text>
              <Text style={[S.td, S.colGrupo]}>{p.grupo_quimico}</Text>
              <Text style={[S.td, S.colRegistro]}>{p.registro_ms}</Text>
              <Text style={[S.td, S.colDiluente]}>{p.diluente}</Text>
              <Text style={[S.td, S.colQtd]}>{p.quantidade}</Text>
              <Text style={[S.td, S.colPraga]}>{p.praga_alvo}</Text>
              <Text style={[S.td, S.colEquip]}>{p.equipamento}</Text>
              <Text style={[S.td, S.colAntidoto, { borderRightWidth: 0 }]}>
                {p.antidoto}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Recomendações & CIT">
        <View style={S.box}>
          <Text style={S.text}>
            {d.recomendacoes_pos ||
              "Evitar contato com superfícies tratadas por 6 horas; reentrada conforme orientação técnica; evitar limpeza úmida por 24 horas; monitorar sinais de reinfestação."}
          </Text>
          <Text style={[S.text, { marginTop: 6 }]}>
            CIT (Centro de Informações Toxicológicas): {cit}
          </Text>
        </View>
      </Section>

      <Text
        style={S.footer}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  );

  /* ───────────────── PÁGINA 3 ───────────────── */
  const Page3 = (
    <Page size="A4" style={S.page}>
      <Section title="Mapeamento de Demanda – Produtos Utilizados">
        <View style={S.box}>
          {Array.isArray(produtosUtilizados) &&
          produtosUtilizados.length > 0 ? (
            produtosUtilizados.map((nome, i) => (
              <Text key={i} style={S.text}>
                • {String(nome)}
              </Text>
            ))
          ) : (
            <Text style={S.text}>—</Text>
          )}
          {d.observacoes_produtos ? (
            <Text style={[S.text, { marginTop: 6 }]}>
              {d.observacoes_produtos}
            </Text>
          ) : null}
        </View>
      </Section>

      <Section title="Mapeamento de Demanda – Cronograma Previsto">
        <View style={S.table}>
          <View style={[S.tr, S.thead]}>
            {["Data", "Atividade/Etapa", "Observações"].map((h, i) => (
              <Text key={i} style={[S.th, i === 2 && { borderRightWidth: 0 }]}>
                {h}
              </Text>
            ))}
          </View>
          {Array.isArray(cronogramaMapa) && cronogramaMapa.length > 0 ? (
            cronogramaMapa.map((e: any, idx: number) => (
              <View key={idx} style={[S.tr, idx % 2 ? S.rowZebra : S.rowMuted]}>
                <Text style={S.td}>{e.data || e.semana || ""}</Text>
                <Text style={S.td}>{e.atividade || e.atividades || ""}</Text>
                <Text style={[S.td, { borderRightWidth: 0 }]}>
                  {e.observacoes || ""}
                </Text>
              </View>
            ))
          ) : (
            <View style={S.tr}>
              <Text style={[S.td, { borderRightWidth: 0 }]}>—</Text>
            </View>
          )}
        </View>
      </Section>

      <Section title="Monitoramento e Garantia">
        <View style={S.box}>
          <Text style={S.text}>{monitoramentoGarantia}</Text>
          {d.data_retorno ? (
            <Text style={[S.text, { marginTop: 6 }]}>
              Data de retorno: {fmtDateBR(d.data_retorno)}
            </Text>
          ) : null}
        </View>
      </Section>

      <Text
        style={S.footer}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  );

  /* ───────────────── PÁGINA 4 ───────────────── */
  const Page4 = (
    <Page size="A4" style={S.page}>
      <View style={[S.header, { marginBottom: 8 }]}>
        <View style={S.headerLeft}>
          {LOGO_SRC ? <Image src={LOGO_SRC} style={S.logo} /> : null}
        </View>
        <View style={S.headerRight}>
          <Text style={S.title}>CERTIFICADO</Text>
          <Text style={S.subtitle}>
            {(comp.name || "Insecta Dedetizadora LTDA").toUpperCase()} • CNPJ:{" "}
            {comp.cnpj || "53.921.773/0001-77"}
          </Text>
        </View>
      </View>

      <View style={S.box}>
        <Text style={S.text}>
          A empresa {comp.name || "Insecta Dedetizadora LTDA"}, devidamente
          licenciada, certifica que realizará/realizou o serviço conforme POP e
          produtos com registro no Ministério da Saúde/ANVISA. Validade prevista
          do certificado: {validadeTexto}
          {dataBase ? ` (até ${validadeAte})` : ""}.
        </Text>
        <Text style={[S.text, { marginTop: 6 }]}>
          Licença Sanitária:{" "}
          {d.licenca_sanitaria || comp.license_sanitaria || "—"}
        </Text>
      </View>

      <View style={[S.box, { marginTop: 8 }]}>
        <View style={S.gridRow}>
          <View style={[S.gridCol, S.gap8]}>
            <KV
              label="Cliente"
              value={d.cliente_nome || printable.client?.name}
            />
          </View>
          <View style={S.gridCol}>
            <KV
              label="CNPJ/CPF"
              value={d.cliente_cnpj || printable.client?.doc}
            />
          </View>
        </View>
        <KV
          label="Endereço"
          value={d.cliente_endereco || printable.client?.address}
        />
        <View style={S.gridRow}>
          <View style={[S.gridCol, S.gap8]}>
            <KV label="Cidade/UF" value={d.cliente_cidade_uf} />
          </View>
          <View style={S.gridCol}>
            <KV label="CEP" value={d.cliente_cep} />
          </View>
        </View>
        <KV label="Pragas controladas" value={safeJoin(d.pragas_alvo)} />
        <KV
          label="Método de aplicação"
          value={safeJoin(d.metodos_utilizados)}
        />
      </View>

      <View style={S.signRow}>
        <View style={S.signCol}>
          <Text style={S.text}>Responsável Técnico</Text>
          <Text style={S.signLine}>__________________________</Text>
          <Text style={[S.text, { textAlign: "center" }]}>
            {d.responsavel_tecnico || comp?.responsible?.name || " "}
          </Text>
          <Text style={[S.text, { textAlign: "center" }]}>
            CREA: {d.crea || comp?.responsible?.crea || " "}
          </Text>
        </View>
        <View style={S.signCol}>
          <Text style={S.text}>
            {(comp.name || "INSECTA DEDETIZADORA").toUpperCase()}
          </Text>
          <Text style={S.signLine}>__________________________</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.text}>Cliente</Text>
          <Text style={S.signLine}>__________________________</Text>
        </View>
      </View>

      <Text
        style={S.footer}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  );

  return (
    <Document>
      {Page1}
      {Page2}
      {Page3}
      {Page4}
    </Document>
  );
}

/* ───────────────── HELPER PARA DOWNLOAD ───────────────── */
export async function downloadFAESPdf(
  printable: FaesPrintable,
  filename?: string
) {
  const doc = <FAESPdfDoc printable={printable} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const code =
    printable?.faes?.public_code || `FAES-${printable?.faes?.id ?? ""}`;
  a.download = filename || `${code}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
