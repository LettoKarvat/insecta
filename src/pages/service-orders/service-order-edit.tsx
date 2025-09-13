import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

import { useClients } from "@/api/hooks/useClients";
import { useProducts } from "@/api/hooks/useProducts";
import {
  useTechnicians,
  useCreateTechnician,
} from "@/api/hooks/useTechnicians";
import {
  useServiceOrder,
  useUpdateServiceOrder,
  useDeleteServiceOrder,
} from "@/api/hooks/useServiceOrders";

/* ---------------- helpers ---------------- */
function toLocalInput(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
const stripEnum = (s?: string) =>
  s ? (String(s).includes(".") ? String(s).split(".").pop()! : String(s)) : "";

/* ---------------- schema ---------------- */
const lineSchema = z.object({
  id: z.number().int().optional(), // mantém vínculo com a linha existente
  product_id: z.coerce.number().int().positive("Selecione o produto"),
  aplicacao: z.string().min(1, "Aplicação obrigatória"),
  diluicao: z.string().min(1, "Diluição obrigatória"),
  quantidade: z.coerce.number().positive("Qtd > 0"),
  garantia: z.string().optional(), // ex.: "90d"
});

const pestGroupSchema = z.object({
  praga: z.string().min(1, "Informe a praga"),
  itens: z
    .array(lineSchema)
    .min(1, "Inclua ao menos 1 produto para esta praga"),
});

const schema = z.object({
  client_id: z.coerce.number().int().positive("Selecione um cliente"),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]), // 👈 canônico
  scheduled_at: z.string().optional(),
  notes: z.string().optional(),
  technician_ids: z
    .array(z.coerce.number().int().positive())
    .optional()
    .default([]),
  pragas: z.array(pestGroupSchema).min(1, "Inclua ao menos 1 praga"),
});
type FormData = z.infer<typeof schema>;

/* ---------------- page ---------------- */
export default function ServiceOrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: so, isLoading } = useServiceOrder(id!);
  const updateOS = useUpdateServiceOrder();
  const deleteOS = useDeleteServiceOrder();

  const { data: clients } = useClients("", "", 200);
  const { data: products } = useProducts(false, "", 500);
  const { data: technicians } = useTechnicians("", 500);
  const createTech = useCreateTechnician();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    getValues,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: undefined as unknown as number,
      status: "OPEN",
      scheduled_at: "",
      notes: "",
      technician_ids: [],
      pragas: [],
    },
  });

  const {
    fields: pestFields,
    append: addPest,
    remove: removePest,
  } = useFieldArray({ control, name: "pragas" });

  // Técnicos como linhas selecionáveis
  const [techRows, setTechRows] = useState<string[]>([]);
  const techOptions = technicians?.items ?? [];
  const selectedTechIds = useMemo(
    () =>
      new Set(
        techRows
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      ),
    [techRows]
  );
  useEffect(() => {
    const ids = Array.from(selectedTechIds);
    setValue("technician_ids", ids, { shouldValidate: true });
  }, [selectedTechIds, setValue]);

  // Preenche o formulário com a OS carregada
  useEffect(() => {
    if (!so) return;

    const clientId =
      (so as any)?.client_id ?? (so as any)?.client?.id ?? undefined;

    // agrupa linhas por praga/pest
    const rawLines: any[] = Array.isArray((so as any)?.lines)
      ? (so as any).lines
      : Array.isArray((so as any)?.items)
      ? (so as any).items
      : [];

    const groups = new Map<string, any[]>();
    rawLines.forEach((ln: any) => {
      const praga = ln?.praga ?? ln?.pest ?? "";
      if (!groups.has(praga)) groups.set(praga, []);
      groups.get(praga)!.push(ln);
    });

    const pragas = Array.from(groups.entries()).map(([praga, itens]) => ({
      praga: praga || "",
      itens: (itens as any[]).map((ln: any) => ({
        id: ln?.id,
        product_id: ln?.product_id ?? ln?.product?.id ?? ln?.produto?.id ?? 0,
        aplicacao: ln?.aplicacao ?? ln?.application ?? "",
        diluicao: ln?.diluicao ?? ln?.dilution ?? "",
        quantidade: Number(ln?.quantidade ?? ln?.quantity ?? 1),
        garantia: ln?.garantia ?? "",
      })),
    }));

    // técnicos
    const techIds: number[] = Array.isArray((so as any)?.technicians)
      ? (so as any).technicians
          .map((t: any) => Number(t?.id))
          .filter((n: number) => Number.isFinite(n) && n > 0)
      : [];

    reset({
      client_id: clientId as number,
      status: stripEnum((so as any)?.status) as any,
      scheduled_at: toLocalInput((so as any)?.scheduled_at),
      notes: (so as any)?.notes ?? "",
      technician_ids: techIds,
      pragas: pragas.length
        ? pragas
        : [
            {
              praga: "",
              itens: [
                {
                  product_id: 0,
                  aplicacao: "",
                  diluicao: "",
                  quantidade: 1,
                  garantia: "",
                },
              ],
            },
          ],
    });

    // preenche UI dos técnicos
    setTechRows(techIds.map((id) => String(id)));
  }, [so, reset]);

  // FieldArray para itens
  function PestGroupRow({ pIndex }: { pIndex: number }) {
    const {
      fields: itemFields,
      append,
      remove,
    } = useFieldArray({
      control,
      name: `pragas.${pIndex}.itens` as const,
    });

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Produtos / Aplicações</h4>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                product_id: 0,
                aplicacao: "",
                diluicao: "",
                quantidade: 1,
                garantia: "",
              })
            }
          >
            Adicionar produto
          </Button>
        </div>

        {itemFields.map((f, iIndex) => (
          <div key={f.id} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>Produto *</Label>
              <select
                className="border rounded-md h-9 px-2 w-full"
                {...register(
                  `pragas.${pIndex}.itens.${iIndex}.product_id` as const
                )}
                defaultValue={String((f as any).product_id ?? 0)}
              >
                <option value={0}>Selecione...</option>
                {(products?.items || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.pragas?.[pIndex]?.itens?.[iIndex]?.product_id && (
                <p className="text-sm text-destructive">
                  {String(
                    errors.pragas?.[pIndex]?.itens?.[iIndex]?.product_id
                      ?.message
                  )}
                </p>
              )}
            </div>

            <div>
              <Label>Aplicação *</Label>
              <Input
                placeholder="Ex.: Pulverização"
                {...register(
                  `pragas.${pIndex}.itens.${iIndex}.aplicacao` as const
                )}
                defaultValue={(f as any).aplicacao || ""}
              />
              {errors.pragas?.[pIndex]?.itens?.[iIndex]?.aplicacao && (
                <p className="text-sm text-destructive">
                  {String(
                    errors.pragas?.[pIndex]?.itens?.[iIndex]?.aplicacao?.message
                  )}
                </p>
              )}
            </div>

            <div>
              <Label>Diluição *</Label>
              <Input
                placeholder="Ex.: 20ml/L"
                {...register(
                  `pragas.${pIndex}.itens.${iIndex}.diluicao` as const
                )}
                defaultValue={(f as any).diluicao || ""}
              />
              {errors.pragas?.[pIndex]?.itens?.[iIndex]?.diluicao && (
                <p className="text-sm text-destructive">
                  {String(
                    errors.pragas?.[pIndex]?.itens?.[iIndex]?.diluicao?.message
                  )}
                </p>
              )}
            </div>

            <div>
              <Label>Qtd *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                {...register(
                  `pragas.${pIndex}.itens.${iIndex}.quantidade` as const
                )}
                defaultValue={(f as any).quantidade ?? 1}
              />
              {errors.pragas?.[pIndex]?.itens?.[iIndex]?.quantidade && (
                <p className="text-sm text-destructive">
                  {String(
                    errors.pragas?.[pIndex]?.itens?.[iIndex]?.quantidade
                      ?.message
                  )}
                </p>
              )}
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Garantia</Label>
                <Input
                  placeholder="Ex.: 90d"
                  {...register(
                    `pragas.${pIndex}.itens.${iIndex}.garantia` as const
                  )}
                  defaultValue={(f as any).garantia || ""}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => remove(iIndex)}
              >
                Remover
              </Button>
            </div>

            {/* mantemos o id da linha (hidden) */}
            <input
              type="hidden"
              {...register(`pragas.${pIndex}.itens.${iIndex}.id` as const)}
              defaultValue={(f as any).id ?? ""}
            />
          </div>
        ))}
      </div>
    );
  }

  const onSubmit = (data: FormData) => {
    // achata grupos em linhas para o payload de update
    const lines = data.pragas.flatMap((group) =>
      group.itens
        .filter((it) => Number(it.product_id) > 0)
        .map((item) => ({
          id: item.id, // se existir, backend atualiza; se não, cria
          praga: group.praga,
          product_id: Number(item.product_id),
          aplicacao: item.aplicacao,
          diluicao: item.diluicao,
          quantidade: Number(item.quantidade),
          garantia: item.garantia, // como string
        }))
    );

    updateOS.mutate(
      {
        id: Number(id),
        data: {
          client_id: Number(data.client_id),
          status: data.status,
          scheduled_at: data.scheduled_at || undefined,
          notes: data.notes || "",
          technician_ids: data.technician_ids ?? [],
          lines,
        },
      },
      {
        onSuccess: () => {
          toast.success("OS atualizada");
          navigate(`/ordens-servico/${id}`);
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "Falha ao salvar OS";
          toast.error(String(msg));
          console.error("updateOS error:", err);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Tem certeza que deseja excluir esta OS?")) return;
    deleteOS.mutate(Number(id), {
      onSuccess: () => {
        toast.success("OS excluída");
        navigate("/ordens-servico");
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Falha ao excluir OS";
        toast.error(String(msg));
      },
    });
  };

  return (
    <PageShell
      title={
        <div className="flex items-center gap-3">
          <Link to={`/ordens-servico/${id}`}>
            <Button variant="ghost" size="sm" className="-ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <span>
            Editar OS{" "}
            <span className="font-semibold">
              {(so as any)?.public_code || id}
            </span>
          </span>
        </div>
      }
      right={
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteOS.isPending}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Excluir OS
        </Button>
      }
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground mt-4">Carregando…</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* cabeçalho */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Cliente *</Label>
              <select
                className="border rounded-md h-9 px-2 w-full"
                {...register("client_id")}
                defaultValue={String(
                  (so as any)?.client_id ?? (so as any)?.client?.id ?? ""
                )}
              >
                <option value="">Selecione...</option>
                {(clients?.items || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.client_id && (
                <p className="text-sm text-destructive">
                  {String(errors.client_id.message)}
                </p>
              )}
            </div>

            <div>
              <Label>Status</Label>
              <select
                className="border rounded-md h-9 px-2 w-full"
                {...register("status")}
                defaultValue={stripEnum((so as any)?.status) || "OPEN"}
              >
                <option value="OPEN">Aberta</option>
                <option value="IN_PROGRESS">Agendada / Em andamento</option>
                <option value="COMPLETED">Concluída</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
              {errors.status && (
                <p className="text-sm text-destructive">
                  {String(errors.status.message)}
                </p>
              )}
            </div>

            <div>
              <Label>Agendada para</Label>
              <Input
                type="datetime-local"
                {...register("scheduled_at")}
                defaultValue={toLocalInput((so as any)?.scheduled_at)}
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              rows={4}
              {...register("notes")}
              defaultValue={(so as any)?.notes || ""}
            />
          </div>

          {/* Técnicos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Técnicos</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    createTech.mutate(
                      { name: "Novo técnico" },
                      {
                        onSuccess: () => {
                          toast.success("Técnico criado");
                        },
                      }
                    )
                  }
                >
                  Novo técnico rápido
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTechRows((prev) => [...prev, ""])}
                >
                  + Adicionar técnico
                </Button>
              </div>
            </div>

            {techRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum técnico selecionado.
              </p>
            )}

            <div className="space-y-2">
              {techRows.map((val, idx) => {
                const currentId = Number(val) || 0;
                const isDup =
                  currentId > 0 &&
                  [...selectedTechIds].filter((x) => x === currentId).length >
                    1;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      className="border rounded-md h-9 px-2 w-full md:max-w-md"
                      value={val}
                      onChange={(e) =>
                        setTechRows((prev) =>
                          prev.map((v, i) => (i === idx ? e.target.value : v))
                        )
                      }
                    >
                      <option value="">Selecione um técnico...</option>
                      {techOptions.map((t) => (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={
                            selectedTechIds.has(t.id) && t.id !== currentId
                          }
                        >
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() =>
                        setTechRows((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remover
                    </Button>
                    {isDup && (
                      <span className="text-xs text-destructive">
                        Duplicado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pragas / Linhas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Pragas</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  addPest({
                    praga: "",
                    itens: [
                      {
                        product_id: 0,
                        aplicacao: "",
                        diluicao: "",
                        quantidade: 1,
                        garantia: "",
                      },
                    ],
                  })
                }
              >
                Adicionar praga
              </Button>
            </div>

            {pestFields.map((pField, pIndex) => (
              <div key={pField.id} className="border rounded-md p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label>Praga *</Label>
                    <Input
                      placeholder="Ex.: Barata, Formiga, etc."
                      {...register(`pragas.${pIndex}.praga` as const)}
                      defaultValue={(pField as any).praga || ""}
                    />
                    {errors.pragas?.[pIndex]?.praga && (
                      <p className="text-sm text-destructive">
                        {String(errors.pragas?.[pIndex]?.praga?.message)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removePest(pIndex)}
                  >
                    Remover praga
                  </Button>
                </div>

                <PestGroupRow pIndex={pIndex} />
              </div>
            ))}

            {errors.pragas && (
              <p className="text-sm text-destructive">
                {String(errors.pragas.message)}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" disabled={isSubmitting || updateOS.isPending}>
              <Save className="w-4 h-4 mr-1" />
              Salvar
            </Button>
            <Link to={`/ordens-servico/${id}`}>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      )}
    </PageShell>
  );
}
