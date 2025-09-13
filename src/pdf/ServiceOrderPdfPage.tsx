// src/pdf/ServiceOrderPdfPage.tsx
import React from "react";
import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { PrintableData } from "@/api/hooks/useServiceOrders";

/* Logo fallback (usa essa se o backend não mandar company.logo_url) */
const LOGO_URL_FALLBACK = "https://iili.io/KTFWdQ4.jpg";
// Se preferir 100% estável, coloque a logo em /public/logo.jpg e use:
// const LOGO_URL_FALLBACK = "/logo.jpg";

const THEME = {
  font: "Helvetica",
  colorText: "#111827",
  colorMuted: "#6b7280",
  colorPrimary: "#1e40af",
  colorBorder: "#e5e7eb",
  colorBgAlt: "#f9fafb",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: THEME.font,
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: THEME.colorBorder,
  },
  brandStrip: {
    height: 2,
    backgroundColor: THEME.colorPrimary,
    marginBottom: 12,
  },
  logo: { width: 120, height: 40, objectFit: "contain" },
  companyInfo: { flex: 1, marginLeft: 15 },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  companyDetails: { fontSize: 8, color: THEME.colorMuted, lineHeight: 1.3 },
  orderCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: THEME.colorPrimary,
    textAlign: "right",
  },
  statusBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 5,
  },
  statusText: {
    color: "#3730a3",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  viaLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "right",
    marginBottom: 10,
  },

  section: { marginBottom: 15 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderColor: "#d1d5db",
    textTransform: "uppercase",
  },

  row: { flexDirection: "row", marginBottom: 3 },
  label: { fontSize: 9, fontWeight: "bold", color: "#374151", width: 90 },
  value: { fontSize: 9, color: "#4b5563", flex: 1 },

  table: { marginTop: 5 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: THEME.colorBgAlt,
    padding: 6,
    borderBottomWidth: 1,
    borderColor: THEME.colorBorder,
  },
  th: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 0.5,
    borderColor: "#f3f4f6",
  },
  tableRowEven: { backgroundColor: "#fafafa" },
  td: {
    fontSize: 8,
    color: "#4b5563",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  productDetails: {
    fontSize: 7,
    color: THEME.colorMuted,
    marginTop: 2,
    fontStyle: "italic",
  },

  notesText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.4,
    textAlign: "justify",
  },

  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signatureBox: {
    width: "45%",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 8,
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 5,
    textAlign: "center",
  },
  signatureImage: {
    width: 120,
    height: 40,
    objectFit: "contain",
    marginBottom: 5,
  },
  signatureName: { fontSize: 8, color: "#4b5563", textAlign: "center" },
  signatureLine: {
    marginTop: 25,
    borderTopWidth: 0.5,
    borderColor: "#9ca3af",
    paddingTop: 3,
  },

  validationSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  validationTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 5,
    textAlign: "center",
  },
  validationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  qrCode: { width: 60, height: 60, marginRight: 10 },
  validationUrl: {
    fontSize: 8,
    color: "#4338ca",
    textDecoration: "underline",
    flex: 1,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderColor: "#d1d5db",
  },
  generatedAt: { fontSize: 8, color: "#6b7280" },
  pageInfo: { fontSize: 8, color: "#6b7280" },
});

interface ServiceOrderPdfPageProps {
  data: PrintableData;
  viaIndex?: number;
  totalVias?: number;
}

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

const encodeUrl = (url?: string | null) => encodeURIComponent(url || "");
const getViaLabel = (index: number) => {
  const labels = ["VIA DO CLIENTE", "VIA DA EMPRESA"];
  return labels[index - 1] || `VIA ${index}`;
};

export function ServiceOrderPdfPage({
  data,
  viaIndex = 1,
}: ServiceOrderPdfPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.viaLabel}>{getViaLabel(viaIndex)}</Text>

      <View style={styles.header}>
        <View style={{ flexDirection: "row", flex: 1 }}>
          <Image
            src={data?.company?.logo_url || LOGO_URL_FALLBACK}
            style={styles.logo}
          />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data?.company?.name || "–"}</Text>
            <Text style={styles.companyDetails}>
              {data?.company?.cnpj ? `CNPJ: ${data.company.cnpj}` : ""}
              {data?.company?.address ? `\n${data.company.address}` : ""}
              {data?.company?.phone ? `\nFone: ${data.company.phone}` : ""}
              {data?.company?.email ? ` | E-mail: ${data.company.email}` : ""}
            </Text>
          </View>
        </View>
        <View>
          <Text style={styles.orderCode}>
            {data?.order?.public_code || "–"}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {data?.order?.status_text || "–"}
            </Text>
          </View>
        </View>
      </View>

      {/* Faixa de marca visível */}
      <View style={styles.brandStrip} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMAÇÕES DA ORDEM</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Criada em:</Text>
          <Text style={styles.value}>
            {formatDateTime(data?.order?.created_at)}
          </Text>
        </View>
        {!!data?.order?.scheduled_at && (
          <View style={styles.row}>
            <Text style={styles.label}>Agendada:</Text>
            <Text style={styles.value}>
              {formatDateTime(data.order.scheduled_at)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DADOS DO CLIENTE</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{data?.client?.name || "–"}</Text>
        </View>
        {!!data?.client?.doc && (
          <View style={styles.row}>
            <Text style={styles.label}>Documento:</Text>
            <Text style={styles.value}>{data.client.doc}</Text>
          </View>
        )}
        {!!data?.client?.address && (
          <View style={styles.row}>
            <Text style={styles.label}>Endereço:</Text>
            <Text style={styles.value}>{data.client.address}</Text>
          </View>
        )}
        {!!data?.client?.phone && (
          <View style={styles.row}>
            <Text style={styles.label}>Telefone:</Text>
            <Text style={styles.value}>{data.client.phone}</Text>
          </View>
        )}
        {!!data?.client?.email && (
          <View style={styles.row}>
            <Text style={styles.label}>E-mail:</Text>
            <Text style={styles.value}>{data.client.email}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ITENS APLICADOS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: "18%" }]}>PRAGA</Text>
            <Text style={[styles.th, { width: "27%" }]}>PRODUTO</Text>
            <Text style={[styles.th, { width: "25%" }]}>APLICAÇÃO</Text>
            <Text style={[styles.th, { width: "15%" }]}>DILUIÇÃO</Text>
            <Text style={[styles.th, { width: "15%" }]}>QTD</Text>
          </View>

          {(data?.items || []).map((item: any, index: number) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowEven]}
            >
              <View style={{ width: "18%" }}>
                <Text style={styles.td}>{item?.pest || "–"}</Text>
              </View>

              <View style={{ width: "27%" }}>
                <Text style={styles.td}>{item?.product || "–"}</Text>
                {!!item?.registration_ms && (
                  <Text style={styles.productDetails}>
                    MS: {item.registration_ms}
                  </Text>
                )}
                {!!item?.group_chemical && (
                  <Text style={styles.productDetails}>
                    Grupo: {item.group_chemical}
                  </Text>
                )}
                {!!item?.composition && (
                  <Text style={styles.productDetails}>
                    Comp.: {item.composition}
                  </Text>
                )}
                {!!item?.recommended_dilution && (
                  <Text style={styles.productDetails}>
                    Dil. Rec.: {item.recommended_dilution}
                  </Text>
                )}
                {!!item?.toxicity_action && (
                  <Text style={styles.productDetails}>
                    Ação Tóx.: {item.toxicity_action}
                  </Text>
                )}
                {!!item?.antidote && (
                  <Text style={styles.productDetails}>
                    Antídoto: {item.antidote}
                  </Text>
                )}
              </View>

              <Text style={[styles.td, { width: "25%" }]}>
                {item?.application || "–"}
              </Text>
              <Text style={[styles.td, { width: "15%" }]}>
                {item?.dilution || "–"}
              </Text>
              <Text style={[styles.td, { width: "15%" }]}>
                {item?.quantity || "–"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {!!data?.order?.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OBSERVAÇÕES</Text>
          <Text style={styles.notesText}>{data.order.notes}</Text>
        </View>
      )}

      <View style={styles.signaturesContainer} wrap={false}>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>TÉCNICO RESPONSÁVEL</Text>
          {!!data?.technicians?.[0] ? (
            <>
              {!!data.technicians[0].signature_url && (
                <Image
                  src={data.technicians[0].signature_url}
                  style={styles.signatureImage}
                />
              )}
              <Text style={styles.signatureName}>
                {data.technicians[0].name || "–"}
              </Text>
              {!!data.technicians[0].registry && (
                <Text style={styles.signatureName}>
                  Registro: {data.technicians[0].registry}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.signatureLine} />
          )}
        </View>

        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>ASSINATURA DO CLIENTE</Text>
          <View style={styles.signatureLine} />
          {!!data?.client_signature && (
            <>
              <Text style={styles.signatureName}>
                {data.client_signature.name || "–"}
              </Text>
              {!!data.client_signature.cpf && (
                <Text style={styles.signatureName}>
                  CPF: {data.client_signature.cpf}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {!!data?.validation_url && (
        <View style={styles.validationSection}>
          <Text style={styles.validationTitle}>VALIDAÇÃO DO DOCUMENTO</Text>
          <View style={styles.validationContent}>
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeUrl(
                data.validation_url
              )}`}
              style={styles.qrCode}
            />
            <Text style={styles.validationUrl}>{data.validation_url}</Text>
          </View>
        </View>
      )}

      <View style={styles.footer} fixed>
        <Text style={styles.generatedAt}>
          Gerado em {formatDateTime(data?.generated_at)}
        </Text>
        <Text
          style={styles.pageInfo}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}
