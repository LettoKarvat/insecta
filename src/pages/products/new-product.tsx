import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCreateProduct } from "@/api/hooks/useProducts";
import type { CreateProductRequest } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Informe o nome"),
  unit: z.string().min(1, "Informe a unidade (ex.: un, L, kg)"),
  min_quantity: z.coerce.number().nonnegative("Mínimo não pode ser negativo"),
  current_quantity: z.coerce
    .number()
    .nonnegative("Quantidade atual não pode ser negativa"),

  // Campos técnicos (opcionais)
  registration_ms: z.string().max(50, "Máx. 50").optional(),
  group_chemical: z.string().max(100, "Máx. 100").optional(),
  composition: z.string().max(255, "Máx. 255").optional(),
  antidote: z.string().max(255, "Máx. 255").optional(),
  toxicity_action: z.string().max(255, "Máx. 255").optional(),
  recommended_dilution: z.string().max(100, "Máx. 100").optional(),

  // Novos campos (opcionais)
  default_diluent: z.string().max(100, "Máx. 100").optional(),
  application_rate: z.string().max(100, "Máx. 100").optional(),
  target_pests: z.string().max(255, "Máx. 255").optional(),
  default_equipment: z.string().max(255, "Máx. 255").optional(),
});

type FormData = z.infer<typeof schema>;

// util: transforma "" -> null e remove chaves vazias
function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === "") {
      out[k] = null;
      return;
    }
    if (v === undefined) return;
    out[k] = v;
  });
  return out;
}

export function NewProduct() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      unit: "",
      min_quantity: 0,
      current_quantity: 0,

      registration_ms: "",
      group_chemical: "",
      composition: "",
      antidote: "",
      toxicity_action: "",
      recommended_dilution: "",

      default_diluent: "",
      application_rate: "",
      target_pests: "",
      default_equipment: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload: CreateProductRequest = cleanPayload(data);
      await createProduct.mutateAsync(payload);
      toast.success("Produto criado!");
      navigate("/produtos");
    } catch {
      // erros já tosteados no hook
    }
  };

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-sm text-red-600 mt-1">{msg}</p> : null;

  return (
    <PageShell
      title="Novo Produto"
      description="Cadastre um novo item de estoque"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
        {/* Básico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nome</Label>
            <Input placeholder="Ex.: K-Othrine CE 25" {...register("name")} />
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
        </div>

        {/* Técnicos (do cadastro do produto) */}
        <div className="space-y-4 border rounded-lg p-4">
          <p className="font-medium">Dados técnicos</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nº ANVISA/MS</Label>
              <Input
                placeholder="Ex.: 3.1789.0006"
                {...register("registration_ms")}
              />
              <ErrorMsg msg={errors.registration_ms?.message} />
            </div>
            <div>
              <Label>Grupo químico</Label>
              <Input
                placeholder="Ex.: Piretrinas e Piretroides"
                {...register("group_chemical")}
              />
              <ErrorMsg msg={errors.group_chemical?.message} />
            </div>
            <div className="md:col-span-2">
              <Label>Composição / princípio ativo</Label>
              <Input
                placeholder="Ex.: Deltametrina 25 g/L"
                {...register("composition")}
              />
              <ErrorMsg msg={errors.composition?.message} />
            </div>
            <div>
              <Label>Antídoto</Label>
              <Input
                placeholder="Ex.: Tratamento sintomático"
                {...register("antidote")}
              />
              <ErrorMsg msg={errors.antidote?.message} />
            </div>
            <div>
              <Label>Ação tóxica / advertências</Label>
              <Input
                placeholder="Ex.: Irritante; evitar inalação"
                {...register("toxicity_action")}
              />
              <ErrorMsg msg={errors.toxicity_action?.message} />
            </div>
            <div>
              <Label>Diluição recomendada (fabricante)</Label>
              <Input
                placeholder="Ex.: 20 ml em 1 L"
                {...register("recommended_dilution")}
              />
              <ErrorMsg msg={errors.recommended_dilution?.message} />
            </div>
          </div>
        </div>

        {/* Defaults para preencher a FAES / certificado (os da imagem) */}
        <div className="space-y-4 border rounded-lg p-4">
          <p className="font-medium">
            Padrões de aplicação (usados como pré-preenchimento)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Diluente (padrão)</Label>
              <Input
                placeholder="Ex.: Água / Politrox"
                {...register("default_diluent")}
              />
              <ErrorMsg msg={errors.default_diluent?.message} />
            </div>
            <div>
              <Label>Quantidade aplicada (padrão)</Label>
              <Input
                placeholder="Ex.: 50 ml/m²"
                {...register("application_rate")}
              />
              <ErrorMsg msg={errors.application_rate?.message} />
            </div>
            <div className="md:col-span-2">
              <Label>Pragas-alvo (padrão)</Label>
              <Input
                placeholder="Ex.: cupins de madeira seca e brocas"
                {...register("target_pests")}
              />
              <ErrorMsg msg={errors.target_pests?.message} />
            </div>
            <div className="md:col-span-2">
              <Label>Equipamento (padrão)</Label>
              <Input
                placeholder="Ex.: Pulverizador costal; seringa para injeção"
                {...register("default_equipment")}
              />
              <ErrorMsg msg={errors.default_equipment?.message} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/produtos")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Salvar
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
