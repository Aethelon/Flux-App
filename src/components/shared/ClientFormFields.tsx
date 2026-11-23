"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { formatPhoneInput } from "@/lib/formatters"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

export interface ClientFormValues {
  name: string
  email: string
  phone: string
  status: "Ativo" | "Inativo"
}

export const EMPTY_CLIENT_FORM: ClientFormValues = {
  name: "",
  email: "",
  phone: "",
  status: "Ativo",
}

export function ClientFormFields({
  form,
  onChange,
}: {
  form: ClientFormValues
  onChange: (f: ClientFormValues) => void
}) {
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-name">{copy.clientName}</Label>
        <Input
          id="client-name"
          placeholder={copy.clientFullName}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-email">{copy.optionalEmail}</Label>
        <Input
          id="client-email"
          type="email"
          placeholder="email@exemplo.com"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-phone">{copy.phone}</Label>
        <Input
          id="client-phone"
          required
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: formatPhoneInput(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-status">{copy.status}</Label>
        <Select
          value={form.status}
          onValueChange={(v) => onChange({ ...form, status: v as "Ativo" | "Inativo" })}
        >
          <SelectTrigger id="client-status">
            <SelectValue>{copy.statuses[form.status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ativo">{copy.statuses.Ativo}</SelectItem>
            <SelectItem value="Inativo">{copy.statuses.Inativo}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
