import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClients } from "@/api/hooks/useClients";
import { useProducts } from "@/api/hooks/useProducts";
import {
  useTechnicians,
  useCreateTechnician,
} from "@/api/hooks/useTechnicians";
import { useCreateServiceOrder } from "@/api/hooks/useServiceOrders";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TechnicianQuickForm } from "@/components/forms/technician-quick-form";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import type { Product } from "@/types/api";

const lineSchema = z.object({
  product_id: z.coerce.number().int().positive("Selecione o produto"),
  aplicacao: z.string().min(1, "Aplicação obrigatória"),
  diluicao: z.string().min(1, "Diluição obrigatória"),
  quantidade: z.coerce.number().positive("Qtd > 0"),
  garantia: z.string().min(1, "Garantia obrigatória"),
});

const pestGroupSchema = z.object({
  praga: z.string().min(1, "Informe a praga"),
  itens: z
    .array(lineSchema)
    .min(1, "Inclua ao menos 1 produto para esta praga"),
});

const schema = z.object({
  client_id: z.coerce.number().int().positive("Selecione um cliente"),
  scheduled_at: z.string().optional(),
  notes: z.string().optional(),
  technician_ids: z
    .array(z.coerce.number().int().positive())
    .optional()
    .default([]),
  pragas: z.array(pestGroupSchema).min(1, "Inclua ao menos 1 praga"),
});

type FormData = z.infer<typeof schema>;

export function NewServiceOrder() {
  const [sp] = useSearchParams();
  const prefillStart = sp.get("start") || "";

  const { data: clients } = useClients("", "", 100);
  const { data: productsData } = useProducts(false, "", 200);
  const products = (productsData?.items || []) as Product[];

  const { data: technicians } = useTechnicians("", 200);
  const createTech = useCreateTechnician();

  const createOS = useCreateServiceOrder();
  const navigate = useNavigate();
  const [techModal, setTechModal] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: undefined as unknown as number,
      scheduled_at: prefillStart || "",
      notes: "",
      technician_ids: [],
      pragas: [
        {
          praga: "",
          itens: [
            {
              product_id: 0,
              aplicacao: "",
              diluicao: "",
              quantidade: 1,
              garantia: "90d",
            },
          ],
        },
      ],
    },
  });

  const {
    fields: pestFields,
    append: addPest,
    remove: removePest,
  } = useFieldArray({ control, name: "pragas" });

  const [techRows, setTechRows] = useState<string[]>([]);
  const techOptions = technicians?.items ?? [];

  useEffect(() => {
    const ids = Array.from(
      new Set(
        techRows
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      )
    );
    setValue("technician_ids", ids, { shouldValidate: true });
  }, [techRows, setValue]);

  const addTechRow = () => setTechRows((prev) => [...prev, ""]);
  const removeTechRow = (idx: number) =>
    setTechRows((prev) => prev.filter((_, i) => i !== idx));
  const changeTechRow = (idx: number, value: string) =>
    setTechRows((prev) => prev.map((v, i) => (i === idx ? value : v)));

  const selectedIds = useMemo(
    () =>
      new Set(
        techRows
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      ),
    [techRows]
  );

  const onSubmit = (data: FormData) => {
    const lines = data.pragas.flatMap((group) =>
      group.itens.map((item) => ({
        praga: group.praga,
        product_id: item.product_id,
        aplicacao: item.aplicacao,
        diluicao: item.diluicao,
        quantidade: item.quantidade,
        garantia: item.garantia,
      }))
    );

    createOS.mutate(
      {
        client_id: data.client_id,
        scheduled_at: data.scheduled_at || undefined,
        notes: data.notes || undefined,
        technician_ids: data.technician_ids ?? [],
        lines,
      },
      {
        onSuccess: () => {
          toast.success("OS criada com sucesso");
          navigate("/ordens-servico");
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "Falha ao salvar OS";
          toast.error(String(msg));
          console.error("createOS error:", err);
        },
      }
    );
  };

  const onInvalid = () => {
    toast.error("Confira os campos obrigatórios destacados");
  };

  const handleCreateTechnician = (payload: {
    name: string;
    email?: string;
    phone?: string;
  }) => {
    createTech.mutate(payload, {
      onSuccess: () => {
        toast.success("Técnico criado");
        setTechModal(false);
        setTechRows((prev) => (prev.length === 0 ? [""] : prev));
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          "Erro ao criar técnico";
        toast.error(String(msg));
      },
    });
  };

  return (
    <PageShell
      title="Nova Ordem de Serviço"
      description="Inclua várias pragas e múltiplos produtos por praga"
    >
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label>Cliente *</Label>
            <select
              className="border rounded-md h-9 px-2 w-full"
              {...register("client_id")}
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
            <Label>Agendado para</Label>
            <Input type="datetime-local" {...register("scheduled_at")} />
          </div>
          <div>
            <Label>Observações</Label>
            <Input placeholder="Notas..." {...register("notes")} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Técnicos</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTechModal(true)}
              >
                Novo técnico
              </Button>
              <Button type="button" variant="secondary" onClick={addTechRow}>
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
              const isDuplicate =
                currentId > 0 &&
                [...selectedIds].filter((id) => id === currentId).length > 1;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    className="border rounded-md h-9 px-2 w-full md:max-w-md"
                    value={val}
                    onChange={(e) => changeTechRow(idx, e.target.value)}
                  >
                    <option value="">Selecione um técnico...</option>
                    {techOptions.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        disabled={selectedIds.has(t.id) && t.id !== currentId}
                      >
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeTechRow(idx)}
                  >
                    Remover
                  </Button>
                  {isDuplicate && (
                    <span className="text-xs text-destructive">Duplicado</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
                      garantia: "90d",
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

              <PestGroupRow
                index={pIndex}
                control={control}
                register={register}
                setValue={setValue}
                products={products}
                itemErrors={errors.pragas?.[pIndex]?.itens}
              />
            </div>
          ))}

          {errors.pragas && (
            <p className="text-sm text-destructive">
              {String(errors.pragas.message)}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              (createOS as any).isPending ?? (createOS as any).isLoading
            }
          >
            {(createOS as any).isPending ?? (createOS as any).isLoading
              ? "Salvando..."
              : "Salvar OS"}
          </Button>
        </div>
      </form>

      <Dialog open={techModal} onOpenChange={setTechModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo técnico</DialogTitle>
          </DialogHeader>
          <TechnicianQuickForm
            onSubmit={handleCreateTechnician}
            onCancel={() => setTechModal(false)}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function PestGroupRow({
  index,
  control,
  register,
  setValue,
  products,
  itemErrors,
}: {
  index: number;
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
  setValue: (name: any, value: any, options?: any) => void;
  products: Product[];
  itemErrors?: Array<{
    product_id?: { message?: string };
    aplicacao?: { message?: string };
    diluicao?: { message?: string };
    quantidade?: { message?: string };
    garantia?: { message?: string };
  }>;
}) {
  const {
    fields: itemFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: `pragas.${index}.itens` as const,
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
              garantia: "90d",
            })
          }
        >
          Adicionar produto
        </Button>
      </div>

      {itemFields.map((f, iIndex) => {
        const productIdPath =
          `pragas.${index}.itens.${iIndex}.product_id` as const;
        const diluicaoPath =
          `pragas.${index}.itens.${iIndex}.diluicao` as const;

        // observar o produto selecionado para mostrar ficha
        const selectedId = useWatch({
          control,
          name: productIdPath,
        }) as unknown as number;

        const selectedProd =
          products.find((p) => p.id === Number(selectedId)) || undefined;

        // integrar onChange do register para auto-preencher diluição recomendada
        const reg = register(productIdPath);
        const handleProductChange: React.ChangeEventHandler<
          HTMLSelectElement
        > = (e) => {
          reg.onChange(e); // mantém controle do RHF
          const pid = Number(e.target.value || 0);
          const prod = products.find((p) => p.id === pid);
          // se tiver diluição recomendada e o campo estiver vazio, preencher
          if (prod?.recommended_dilution) {
            const curr = ((control as any)._formValues?.pragas?.[index]
              ?.itens?.[iIndex]?.diluicao || "") as string;
            if (!curr?.trim()) {
              setValue(diluicaoPath, prod.recommended_dilution, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }
          }
        };

        return (
          <div key={f.id} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Label>Produto *</Label>
              <select
                className="border rounded-md h-9 px-2 w-full"
                {...reg}
                onChange={handleProductChange}
              >
                <option value={0}>Selecione...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {itemErrors?.[iIndex]?.product_id && (
                <p className="text-sm text-destructive">
                  {String(itemErrors?.[iIndex]?.product_id?.message)}
                </p>
              )}

              {/* Bloco de ficha do produto selecionado */}
              {selectedProd && (
                <div className="mt-2 rounded-md border bg-muted/40 p-2 text-xs leading-5">
                  <div>
                    <span className="font-semibold">Registro MS:</span>{" "}
                    {selectedProd.registration_ms || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Grupo químico:</span>{" "}
                    {selectedProd.group_chemical || "—"}
                  </div>
                  {selectedProd.composition && (
                    <div>
                      <span className="font-semibold">Composição:</span>{" "}
                      {selectedProd.composition}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Diluição recomendada:</span>{" "}
                    {selectedProd.recommended_dilution || "—"}
                  </div>
                  {selectedProd.antidote && (
                    <div>
                      <span className="font-semibold">Antídoto:</span>{" "}
                      {selectedProd.antidote}
                    </div>
                  )}
                  {selectedProd.emergency_phone && (
                    <div>
                      <span className="font-semibold">
                        Telefone de emergência:
                      </span>{" "}
                      {selectedProd.emergency_phone}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Aplicação *</Label>
              <Input
                placeholder="Ex.: Pulverização"
                {...register(
                  `pragas.${index}.itens.${iIndex}.aplicacao` as const
                )}
              />
              {itemErrors?.[iIndex]?.aplicacao && (
                <p className="text-sm text-destructive">
                  {String(itemErrors?.[iIndex]?.aplicacao?.message)}
                </p>
              )}
            </div>

            <div>
              <Label>Diluição *</Label>
              <Input placeholder="Ex.: 20ml/L" {...register(diluicaoPath)} />
              {itemErrors?.[iIndex]?.diluicao && (
                <p className="text-sm text-destructive">
                  {String(itemErrors?.[iIndex]?.diluicao?.message)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <div>
                <Label>Qtd *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  {...register(
                    `pragas.${index}.itens.${iIndex}.quantidade` as const
                  )}
                />
                {itemErrors?.[iIndex]?.quantidade && (
                  <p className="text-sm text-destructive">
                    {String(itemErrors?.[iIndex]?.quantidade?.message)}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <Label>Garantia *</Label>
                <Input
                  placeholder="Ex.: 90d"
                  {...register(
                    `pragas.${index}.itens.${iIndex}.garantia` as const
                  )}
                />
                {itemErrors?.[iIndex]?.garantia && (
                  <p className="text-sm text-destructive">
                    {String(itemErrors?.[iIndex]?.garantia?.message)}
                  </p>
                )}
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(iIndex)}
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
