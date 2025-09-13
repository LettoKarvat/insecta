import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateTechnicianRequest } from "@/types/api"

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
})

export function TechnicianQuickForm({ onSubmit, onCancel }: {
  onSubmit: (data: CreateTechnicianRequest) => void
  onCancel?: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTechnicianRequest>({
    resolver: zodResolver(schema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <Label>Nome *</Label>
        <Input {...register("name")} placeholder="Ex.: João Técnico" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message as string}</p>}
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" {...register("email")} placeholder="email@exemplo.com" />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message as string}</p>}
      </div>
      <div className="space-y-1">
        <Label>Telefone</Label>
        <Input {...register("phone")} placeholder="(41) 99999-9999" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
