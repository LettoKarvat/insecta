import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { FaesPrintable } from "@/api/hooks/useFaes";

/* estilos simples e legíveis (sem depender de tema) */
const s = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 14, marginBottom: 6, fontWeight: 700 },
  h2: { fontSize: 12, marginTop: 10, marginBottom: 4, fontWeight: 700 },
  row: { flexDirection: "row", gap: 8 },
  col: { flex: 1 },
  box: {
    border: 1,
    borderColor: "#222",
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  label: { fontSize: 9, color: "#555" },
  text: { fontSize: 10 },
  table: {
    border: 1,
    borderColor: "#222",
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  tr: { flexDirection: "row" },
  th: {
    flex: 1,
    padding: 6,
    backgroundColor: "#eee",
    borderRight: 1,
    borderColor: "#222",
    fontWeight: 700,
  },
  td: {
    flex: 1,
    padding: 6,
    borderTop: 1,
    borderRight: 1,
    borderColor: "#222",
  },
});

function KV({ label, value }: { label: string; value?: any }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.text}>{value ?? "—"}</Text>
    </View>
  );
}

export default function FAESPdfPage({
  printable,
}: {
  printable: FaesPrintable;
}) {
  const d = printable.data || {};
  const produtos = Array.isArray(d.produtos_repeater)
    ? d.produtos_repeater
    : [];
  const execs = Array.isArray(d.execucoes) ? d.execucoes : [];
  const lotes = Array.isArray(d.registros_repeater) ? d.registros_repeater : [];
  const inspe = Array.isArray(d.inspecoes_repeater) ? d.inspecoes_repeater : [];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <View style={s.box}>
          <Text style={s.h1}>Ficha Avaliativa de Execução de Serviço</Text>
          <View style={s.row}>
            <View style={s.col}>
              <KV label="Nº FAES" value={printable.faes.public_code} />
            </View>
            <View style={s.col}>
              <KV label="Data de Emissão" value={d.data_emissao} />
            </View>
            <View style={s.col}>
              <KV
                label="Status"
                value={printable.faes.finalized ? "Finalizada" : "Rascunho"}
              />
            </View>
          </View>
        </View>

        {/* Identificação */}
        <Text style={s.h2}>Identificação</Text>
        <View style={s.box}>
          <View style={s.row}>
            <View style={s.col}>
              <KV
                label="Cliente"
                value={d.cliente_nome || printable.client.name}
              />
            </View>
            <View style={s.col}>
              <KV
                label="CNPJ/CPF"
                value={d.cliente_cnpj || printable.client.doc}
              />
            </View>
          </View>
          <View style={s.row}>
            <View style={s.col}>
              <KV
                label="Endereço"
                value={d.cliente_endereco || printable.client.address}
              />
            </View>
          </View>
          <View style={s.row}>
            <View style={s.col}>
              <KV label="Cidade/UF" value={d.cliente_cidade_uf} />
            </View>
            <View style={s.col}>
              <KV label="CEP" value={d.cliente_cep} />
            </View>
            <View style={s.col}>
              <KV label="Área de Aplicação" value={d.area_aplicacao} />
            </View>
          </View>
          <View style={s.row}>
            <View style={s.col}>
              <KV label="Área Tratada (m²)" value={d.area_tratada_m2} />
            </View>
            <View style={s.col}>
              <KV label="Responsável Técnico" value={d.responsavel_tecnico} />
            </View>
            <View style={s.col}>
              <KV label="CREA/Registro" value={d.crea} />
            </View>
          </View>
          <View style={s.row}>
            <View style={s.col}>
              <KV label="Aplicador" value={d.aplicador} />
            </View>
            <View style={s.col}>
              <KV label="Licença Sanitária" value={d.licenca_sanitaria} />
            </View>
            <View style={s.col}>
              <KV label="OS (se houver)" value={d.os_numero} />
            </View>
          </View>
        </View>

        {/* Escopo */}
        <Text style={s.h2}>Escopo do Serviço</Text>
        <View style={s.box}>
          <KV label="Descrição" value={d.escopo_texto} />
        </View>

        {/* Produtos */}
        <Text style={s.h2}>Produtos Utilizados</Text>
        <View style={s.table}>
          <View style={s.tr}>
            {[
              "Produto",
              "Princípio ativo",
              "Registro MS",
              "Diluente",
              "Qtd",
              "Praga alvo",
              "Equipamento",
              "Antídoto",
              "Lote",
              "Validade",
            ].map((h, i) => (
              <Text key={i} style={[s.th, i === 9 && { borderRight: 0 }]}>
                {h}
              </Text>
            ))}
          </View>
          {produtos.map((p: any, idx: number) => (
            <View key={idx} style={s.tr}>
              <Text style={s.td}>{p.produto}</Text>
              <Text style={s.td}>{p.principio_ativo}</Text>
              <Text style={s.td}>{p.registro_ms}</Text>
              <Text style={s.td}>{p.diluente}</Text>
              <Text style={s.td}>{p.quantidade}</Text>
              <Text style={s.td}>{p.praga_alvo}</Text>
              <Text style={s.td}>{p.equipamento}</Text>
              <Text style={s.td}>{p.antidoto}</Text>
              <Text style={s.td}>{p.lote}</Text>
              <Text style={[s.td, { borderRight: 0 }]}>{p.validade}</Text>
            </View>
          ))}
        </View>

        {/* Métodos */}
        <Text style={s.h2}>Métodos Utilizados</Text>
        <View style={s.box}>
          <KV
            label="Métodos"
            value={(Array.isArray(d.metodos_utilizados)
              ? d.metodos_utilizados
              : []
            ).join(", ")}
          />
          <KV label="Outros" value={d.metodos_outros} />
        </View>

        {/* Cronograma */}
        <Text style={s.h2}>Cronograma / Execução</Text>
        <View style={s.table}>
          <View style={s.tr}>
            {["Data", "Atividade/Etapa", "Observações"].map((h, i) => (
              <Text key={i} style={[s.th, i === 2 && { borderRight: 0 }]}>
                {h}
              </Text>
            ))}
          </View>
          {execs.map((e: any, idx: number) => (
            <View key={idx} style={s.tr}>
              <Text style={s.td}>{e.data}</Text>
              <Text style={s.td}>{e.atividade}</Text>
              <Text style={[s.td, { borderRight: 0 }]}>{e.observacoes}</Text>
            </View>
          ))}
        </View>

        {/* Segurança / EPIs */}
        <Text style={s.h2}>Segurança e EPIs</Text>
        <View style={s.box}>
          <KV
            label="EPIs"
            value={(Array.isArray(d.epis_utilizados)
              ? d.epis_utilizados
              : []
            ).join(", ")}
          />
          <View style={s.row}>
            <View style={s.col}>
              <KV label="Tempo de reentrada (h)" value={d.reentrada_horas} />
            </View>
            <View style={s.col}>
              <KV
                label="Recomendações pós-aplicação"
                value={d.recomendacoes_pos}
              />
            </View>
          </View>
        </View>

        {/* Registros e Lotes */}
        {!!lotes.length && (
          <>
            <Text style={s.h2}>Registros e Lotes</Text>
            <View style={s.table}>
              <View style={s.tr}>
                {["Produto", "Lote", "Fabricante", "Validade"].map((h, i) => (
                  <Text key={i} style={[s.th, i === 3 && { borderRight: 0 }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {lotes.map((r: any, idx: number) => (
                <View key={idx} style={s.tr}>
                  <Text style={s.td}>{r.produto}</Text>
                  <Text style={s.td}>{r.lote}</Text>
                  <Text style={s.td}>{r.fabricante}</Text>
                  <Text style={[s.td, { borderRight: 0 }]}>{r.validade}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Avaliação (notas) */}
        <Text style={s.h2}>Métricas Avaliativas</Text>
        <View style={s.box}>
          <View style={s.row}>
            <View style={s.col}>
              <KV label="Cronograma" value={d.nota_cronograma} />
            </View>
            <View style={s.col}>
              <KV label="Qualidade" value={d.nota_qualidade} />
            </View>
            <View style={s.col}>
              <KV label="Comunicação" value={d.nota_comunicacao} />
            </View>
          </View>
          <View style={s.row}>
            <View style={s.col}>
              <KV label="Organização" value={d.nota_organizacao} />
            </View>
            <View style={s.col}>
              <KV label="Segurança" value={d.nota_seguranca} />
            </View>
            <View style={s.col}>
              <KV label="Documentação" value={d.nota_documentacao} />
            </View>
          </View>
          <KV label="Observações" value={d.avaliacao_observacoes} />
        </View>

        {/* Inspeções */}
        {!!inspe.length && (
          <>
            <Text style={s.h2}>Inspeções / Reinspeções</Text>
            <View style={s.table}>
              <View style={s.tr}>
                {["Data", "Tipo", "Assinatura (arquivo)"].map((h, i) => (
                  <Text key={i} style={[s.th, i === 2 && { borderRight: 0 }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {inspe.map((r: any, idx: number) => (
                <View key={idx} style={s.tr}>
                  <Text style={s.td}>{r.data}</Text>
                  <Text style={s.td}>{r.tipo}</Text>
                  <Text style={[s.td, { borderRight: 0 }]}>
                    {r.assinatura ? "Anexo" : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}
