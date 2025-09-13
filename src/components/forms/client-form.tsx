import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateClientRequest } from "@/types/api"

const clientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  doc: z.string().min(11, "Documento inválido"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),

  // Campos de UI: serão combinados em 'address'
  street: z.string().min(3, "Endereço deve ter pelo menos 3 caracteres"),
  city: z.string().min(2, "Cidade obrigatória"),
  uf: z.string().length(2, "UF inválida"),
  cep: z.string().min(8, "CEP inválido"),
})

type UIForm = z.infer<typeof clientSchema>

type Props = {
  onSubmit: (data: CreateClientRequest) => void
  initialValues?: Partial<CreateClientRequest>
  loading?: boolean
  onCancel?: () => void
}

function parseAddress(address?: string) {
  const a = address || ""
  // Tenta "Rua..., Cidade - UF, 00000-000"
  const m = a.match(/^(.*?),\s*([^,-]+)\s*-\s*([A-Za-z]{2}),\s*(\d{5}-?\d{3})$/)
  if (m) {
    return {
      street: m[1].trim(),
      city: m[2].trim(),
      uf: m[3].toUpperCase(),
      cep: m[4],
    }
  }
  // Fallback: extrai CEP e deixa o resto no street/city
  const cepMatch = a.match(/(\d{5}-?\d{3})/)
  const cep = cepMatch ? cepMatch[1] : ""
  const remainder = a.replace(cep, "").trim().replace(/,\s*$/, "")
  const parts = remainder.split(",").map(s => s.trim()).filter(Boolean)
  let street = parts.slice(0, -1).join(", ") || remainder
  let city = parts.slice(-1)[0] || ""
  let uf = ""
  const ufMatch = city.match(/\b([A-Za-z]{2})\b/)
  if (ufMatch) {
    uf = ufMatch[1].toUpperCase()
    city = city.replace(/\b([A-Za-z]{2})\b/, "").replace("-", "").trim()
  }
  return { street, city, uf, cep }
}

export function ClientForm({ onSubmit, initialValues, loading, onCancel }: Props) {
  const defaults = {
    name: initialValues?.name || "",
    doc: initialValues?.doc || "",
    email: initialValues?.email || "",
    phone: initialValues?.phone || "",
    street: "",
    city: "",
    uf: "",
    cep: "",
  }

  const parsed = parseAddress(initialValues?.address)
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<UIForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      ...defaults,
      street: parsed.street || defaults.street,
      city: parsed.city || defaults.city,
      uf: parsed.uf || defaults.uf,
      cep: parsed.cep || defaults.cep,
    }
  })

  useEffect(() => {
    const p = parseAddress(initialValues?.address)
    reset({
      name: initialValues?.name || "",
      doc: initialValues?.doc || "",
      email: initialValues?.email || "",
      phone: initialValues?.phone || "",
      street: p.street || "",
      city: p.city || "",
      uf: p.uf || "",
      cep: p.cep || "",
    })
  }, [initialValues, reset])

  const submit = (data: UIForm) => {
    // compõe address para o backend
    const composedAddress = `${data.street}, ${data.city} - ${data.uf.toUpperCase()}, ${data.cep}`
    onSubmit({
      name: data.name,
      doc: data.doc,
      email: data.email,
      phone: data.phone,
      address: composedAddress,
    })
  }

  const cepMask = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0,5)}-${digits.slice(5)}`
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" {...register("name")} placeholder="Cliente Exemplo LTDA" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc">Documento *</Label>
        <Input id="doc" {...register("doc")} placeholder="00.000.000/0000-00" />
        {errors.doc && <p className="text-sm text-destructive">{errors.doc.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...register("email")} placeholder="exemplo@email.com" />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input id="phone" {...register("phone")} placeholder="(41) 99999-9999" />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="street">Endereço (Rua/Nº/Bairro) *</Label>
        <Input id="street" {...register("street")} placeholder="Rua X, 123 - Centro" />
        {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input id="city" {...register("city")} placeholder="Curitiba" />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="md:col-span-1 space-y-2">
          <Label htmlFor="uf">UF *</Label>
          <select id="uf" className="border rounded-md h-9 px-2 w-full" {...register("uf")}>
            <option value="">UF</option>
            {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {errors.uf && <p className="text-sm text-destructive">{errors.uf.message}</p>}
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="cep">CEP *</Label>
          <Input id="cep" {...register("cep")} placeholder="00000-000"
            onChange={(e) => { e.target.value = cepMask(e.target.value) }} />
          {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={!!loading}>{loading ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  )
}
