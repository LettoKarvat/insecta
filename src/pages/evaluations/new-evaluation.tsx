import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useClients } from "@/api/hooks/useClients"
import { useCreateEvaluation, useEvaluationPdf } from "@/api/hooks/useEvaluations"
import { useNavigate } from "react-router-dom"

const lineSchema = z.object({
  praga: z.string().optional(),
  area: z.string().optional(),
  observacao: z.string().optional(),
})
const schema = z.object({
  client_id: z.coerce.number().int().positive(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})
type FormData = z.infer<typeof schema>

export function NewEvaluation() {
  const { data: clients } = useClients("", "", 100)
  const createEval = useCreateEvaluation()
  const pdf = useEvaluationPdf()
  const nav = useNavigate()

  const { register, handleSubmit, control } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: undefined as unknown as number,
      notes: "",
      lines: [{ praga: "", area: "", observacao: "" }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "lines" })

  const onSubmit = (data: FormData) => {
    createEval.mutate(data, {
      onSuccess: (ev) => {
        nav("/avaliacoes")
        pdf.mutate({ id: ev.id })
      },
    })
  }

  return (
    <PageShell title="Nova FAES" description="Ficha de Avaliação de Ambiente">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Label>Cliente *</Label>
            <select className="border rounded-md h-9 px-2 w-full" {...register("client_id")}>
              <option value="">Selecione...</option>
              {(clients?.items || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Input placeholder="Notas..." {...register("notes")} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Itens</h3>
            <Button type="button" variant="outline" onClick={() => append({ praga: "", area: "", observacao: "" })}>
              Adicionar
            </Button>
          </div>
          {fields.map((f, idx) => (
            <div key={f.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-md p-3">
              <div>
                <Label>Praga</Label>
                <Input {...register(`lines.${idx}.praga` as const)} />
              </div>
              <div>
                <Label>Área</Label>
                <Input {...register(`lines.${idx}.area` as const)} />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Observação</Label>
                  <Input {...register(`lines.${idx}.observacao` as const)} />
                </div>
                <Button type="button" variant="destructive" onClick={() => remove(idx)}>Remover</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={createEval.isPending}>
            {createEval.isPending ? "Salvando..." : "Salvar FAES"}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
