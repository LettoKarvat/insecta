import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  useProduct,
  useUpdateProduct,
  useUpdateProductQuantity,
  useDeleteProduct,
  computeUrgency,
  labelUrgency,
} from "@/api/hooks/useProducts";
import type { CreateProductRequest } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Informe o nome"),
  unit: z.string().min(1, "Informe a unidade (ex.: un, L, kg)"),
  min_quantity: z.coerce.number().nonnegative("Mínimo não pode ser negativo"),
  current_quantity: z.coerce
    .number()
    .nonnegative("Quantidade atual não pode ser negativa"),

  // técnicos
  registration_ms: z.string().max(50).nullable().optional(),
  group_chemical: z.string().max(100).nullable().optional(),
  composition: z.string().max(255).nullable().optional(),
  antidote: z.string().max(255).nullable().optional(),
  toxicity_action: z.string().max(255).nullable().optional(),
  recommended_dilution: z.string().max(100).nullable().optional(),
  emergency_phone: z.string().max(50).nullable().optional(),

  // novos
  default_diluent: z.string().max(100).nullable().optional(),
  application_rate: z.string().max(100).nullable().optional(),
  target_pests: z.string().max(255).nullable().optional(),
  default_equipment: z.string().max(255).nullable().optional(),
});

type FormData = z.infer<typeof schema>;

function toNull(s: any) {
  return s === "" ? null : s;
}

function pickDirty<T extends Record<string, any>>(
  values: T,
  dirty: Record<string, any>
): Partial<T> {
  const out: Partial<T> = {};
  Object.keys(dirty || {}).forEach((k) => {
    (out as any)[k] = toNull(values[k]);
  });
  return out;
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const productId = useMemo(() => Number(id), [id]);
  const navigate = useNavigate();

  const { data: product, isLoading, isError } = useProduct(productId);
  const updateProduct = useUpdateProduct();
  const updateQty = useUpdateProductQuantity();
  const delProduct = useDeleteProduct();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, dirtyFields },
    reset,
    getValues,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // carrega valores quando o produto chega
  useEffect(() => {
    if (!product) return;
    reset({
      name: product.name,
      unit: product.unit,
      min_quantity: product.min_quantity,
      current_quantity: product.current_quantity,

      registration_ms: product.registration_ms ?? null,
      group_chemical: product.group_chemical ?? null,
      composition: product.composition ?? null,
      antidote: product.antidote ?? null,
      toxicity_action: product.toxicity_action ?? null,
      recommended_dilution: product.recommended_dilution ?? null,
      emergency_phone: product.emergency_phone ?? null,

      default_diluent: product.default_diluent ?? null,
      application_rate: product.application_rate ?? null,
      target_pests: product.target_pests ?? null,
      default_equipment: product.default_equipment ?? null,
    });
  }, [product, reset]);

  const onSubmit = async () => {
    const full = getValues();
    const payload = pickDirty(
      full as any,
      dirtyFields
    ) as Partial<CreateProductRequest>;

    if (Object.keys(payload).length === 0) {
      toast("Nada para salvar 😊");
      return;
    }

    try {
      await updateProduct.mutateAsync({ id: productId, data: payload });
      toast.success("Produto atualizado!");
    } catch (e: any) {
      /* erros já tratados por interceptor */
    }
  };

  const [delta, setDelta] = useState<number>(0);

  // Prévia de urgência em tempo real (com base nos campos do form)
  const liveMin = watch("min_quantity");
  const liveCur = watch("current_quantity");
  const liveUrg = computeUrgency(liveMin, liveCur);
  const liveLabel = labelUrgency(liveUrg);
  const liveVariant =
    liveUrg === 0 ? "secondary" : liveUrg < 50 ? "default" : "destructive";

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-sm text-red-600 mt-1">{msg}</p> : null;

  if (isLoading) {
    return (
      <PageShell title="Produto" description="Carregando detalhes...">
        <div className="h-24 rounded bg-muted animate-pulse" />
      </PageShell>
    );
  }

  if (isError || !product) {
    return (
      <PageShell
        title="Produto não encontrado"
        description="Verifique o ID e tente novamente."
      >
        <Button variant="outline" onClick={() => navigate("/produtos")}>
          Voltar
        </Button>
      </PageShell>
    );
  }

  const serverUrg = Math.max(0, Math.min(100, product.urgency_number ?? 0));
  const serverLabel = product.urgency_label ?? labelUrgency(serverUrg);
  const serverVariant =
    serverUrg === 0 ? "secondary" : serverUrg < 50 ? "default" : "destructive";

  return (
    <PageShell
      title={`Produto: ${product.name}`}
      description={
        <span className="text-sm text-muted-foreground">
          ID #{product.id} • criado em{" "}
          {new Date(product.created_at).toLocaleString()}
          {product.updated_at
            ? ` • atualizado em ${new Date(
                product.updated_at
              ).toLocaleString()}`
            : ""}
          {product.is_critical ? (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">
              Estoque crítico
            </span>
          ) : null}
          <Badge className="ml-2" variant={serverVariant as any}>
            Urgência atual: {serverUrg}% {serverLabel}
          </Badge>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
        {/* Básico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nome</Label>
            <Input {...register("name")} />
            <ErrorMsg msg={errors.name?.message} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input placeholder="Ex.: un, L, kg" {...register("unit")} />
            <ErrorMsg msg={errors.unit?.message} />
          </div>
          <div>
            <Label>Qtd. Mínima</Label>
            <Input
              type="number"
              step="0.01"
              {...register("min_quantity", { valueAsNumber: true })}
            />
            <ErrorMsg msg={errors.min_quantity?.message} />
          </div>
          <div>
            <Label>Qtd. Atual</Label>
            <Input
              type="number"
              step="0.01"
              {...register("current_quantity", { valueAsNumber: true })}
            />
            <ErrorMsg msg={errors.current_quantity?.message} />
          </div>

          {/* Prévia de urgência (live) */}
          <div className="md:col-span-2">
            <Label>Urgência (prévia)</Label>
            <div className="flex items-center gap-8 mt-1">
              <div className="text-sm">
                <span className="font-medium">{liveUrg}%</span> ({liveLabel})
              </div>
              <Badge variant={liveVariant as any}>
                {liveUrg}% {liveLabel}
              </Badge>
            </div>
          </div>
        </div>

        {/* Técnicos */}
        <div className="space-y-4 border rounded-lg p-4">
          <p className="font-medium">Dados técnicos</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nº ANVISA/MS</Label>
              <Input
                {...register("registration_ms")}
                placeholder="Ex.: 3.1789.0006"
              />
              <ErrorMsg msg={errors.registration_ms?.message} />
            </div>
            <div>
              <Label>Grupo químico</Label>
              <Input
                {...register("group_chemical")}
                placeholder="Ex.: Piretrinas e Piretroides"
              />
              <ErrorMsg msg={errors.group_chemical?.message} />
            </div>
            <div className="md:col-span-2">
              <Label>Composição / princípio ativo</Label>
              <Input
                {...register("composition")}
                placeholder="Ex.: Deltametrina 25 g/L"
              />
              <ErrorMsg msg={errors.composition?.message} />
            </div>
            <div>
              <Label>Antídoto</Label>
              <Input
                {...register("antidote")}
                placeholder="Ex.: Tratamento sintomático"
              />
              <ErrorMsg msg={errors.antidote?.message} />
            </div>
            <div>
              <Label>Ação tóxica / advertências</Label>
              <Input
                {...register("toxicity_action")}
                placeholder="Ex.: Irritante; evitar inalação"
              />
              <ErrorMsg msg={errors.toxicity_action?.message} />
            </div>
            <div>
              <Label>Diluição recomendada (fabricante)</Label>
              <Input
                {...register("recommended_dilution")}
                placeholder="Ex.: 20 ml em 1 L"
              />
              <ErrorMsg msg={errors.recommended_dilution?.message} />
            </div>
            <div>
              <Label>Telefone de emergência</Label>
              <Input
                {...register("emergency_phone")}
                placeholder="Ex.: 0800 722 6001"
              />
              <ErrorMsg msg={errors.emergency_phone?.message} />
            </div>
          </div>
        </div>

        {/* Defaults para FAES/certificados */}
        <div className="space-y-4 border rounded-lg p-4">
          <p className="font-medium">Padrões de aplicação</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Diluente (padrão)</Label>
              <Input
                {...register("default_diluent")}
                placeholder="Ex.: Água / Politrox"
              />
              <ErrorMsg msg={errors.default_diluent?.message} />
            </div>
            <div>
              <Label>Quantidade aplicada (padrão)</Label>
              <Input
                {...register("application_rate")}
                placeholder="Ex.: 50 ml/m²"
              />
              <ErrorMsg msg={errors.application_rate?.message} />
            </div>
            <div className="md:col-span-2">
              <Label>Pragas-alvo (padrão)</Label>
              <Input
                {...register("target_pests")}
                placeholder="Ex.: cupins de madeira seca e brocas"
              />
              <ErrorMsg msg={errors.target_pests?.message} />
            </div>
            <div className="md:col-span-2">
              <Label>Equipamento (padrão)</Label>
              <Input
                {...register("default_equipment")}
                placeholder="Ex.: Pulverizador costal; seringa para injeção"
              />
              <ErrorMsg msg={errors.default_equipment?.message} />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-end gap-2">
            <div>
              <Label className="block mb-1">Ajustar quantidade (δ)</Label>
              <Input
                type="number"
                step="0.01"
                value={Number.isFinite(delta) ? delta : 0}
                onChange={(e) => setDelta(Number(e.target.value))}
                className="w-40"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await updateQty.mutateAsync({
                    id: productId,
                    data: { delta },
                  });
                  toast.success("Quantidade atualizada!");
                  setDelta(0);
                } catch {}
              }}
            >
              Aplicar δ
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDelta((d) => d + 1)}
            >
              +1
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDelta((d) => d - 1)}
            >
              -1
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/produtos")}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || updateProduct.isPending}
            >
              Salvar alterações
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!confirm("Tem certeza que deseja excluir este produto?"))
                  return;
                try {
                  await delProduct.mutateAsync(productId);
                  toast.success("Produto excluído.");
                  navigate("/produtos");
                } catch {}
              }}
            >
              Excluir
            </Button>
          </div>
        </div>
      </form>
    </PageShell>
  );
}
