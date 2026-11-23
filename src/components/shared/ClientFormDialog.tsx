"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ClientFormFields,
  EMPTY_CLIENT_FORM,
  type ClientFormValues,
} from "./ClientFormFields"
import { useClientsStore } from "@/store/clientsStore"
import type { Client } from "@/types/client"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

export function ClientFormDialog({
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  onCreated?: (client: Client) => void
}) {
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]
  const addClient = useClientsStore((s) => s.addClient)
  const [form, setForm] = useState<ClientFormValues>({
    ...EMPTY_CLIENT_FORM,
    name: initialName,
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    if (submitting) return
    setSubmitting(true)
    try {
      const client = await addClient(form)
      toast.success(copy.clientCreated)
      onCreated?.(client)
      onOpenChange(false)
    } catch {
      toast.error(copy.clientCreateFailed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.newClient}</DialogTitle>
        </DialogHeader>
        <ClientFormFields form={form} onChange={setForm} />
        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.phone.trim() || submitting}
            className="bg-(--color-accent) text-white"
          >
            {copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
