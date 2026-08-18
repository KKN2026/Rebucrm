'use client'

import { useState } from 'react'
import { saveInstellingenEmail } from '@/lib/actions'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

interface EmailViewProps {
  smtpHost: string
  smtpPort: number | null
  smtpUser: string
  smtpPassIsSet: boolean
  smtpFrom: string
  mailBcc: string
  mailBccActief: boolean
  broadcastBccActief: boolean
  imapHost: string
  imapPort: number | null
  imapUser: string
  imapPassIsSet: boolean
}

export function EmailView(props: EmailViewProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function handleSave(formData: FormData) {
    setLoading(true); setError(''); setSuccess('')
    const result = await saveInstellingenEmail(formData)
    if (result.error) setError(result.error)
    else setSuccess('E-mailinstellingen opgeslagen')
    setLoading(false)
  }

  const secretPlaceholder = (isSet: boolean) =>
    isSet ? '•••••••• (ingesteld — laat leeg om te behouden)' : 'Niet ingesteld'

  return (
    <div className="space-y-6">
      {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}
      <p className="text-sm text-gray-500">
        Uitgaande mail loopt op dit moment via Resend (op serverniveau ingesteld). De SMTP-velden
        hieronder worden alleen gebruikt als Resend niet actief is. Afzenderadres en BCC gelden wél
        altijd, ongeacht Resend of SMTP. Zonder ingevulde instelling wordt teruggevallen op de env-vars
        die in het hostingplatform zijn ingesteld. Leeg laten van een wachtwoordveld behoudt de huidige waarde.
      </p>

      <form action={handleSave}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-medium text-gray-900">Afzender en BCC</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="smtp_from" name="smtp_from" label="Afzenderadres" placeholder="info@bedrijf.nl" defaultValue={props.smtpFrom} />
              <div className="space-y-2">
                <Input id="mail_bcc" name="mail_bcc" label="BCC (kopie van elke verstuurde mail)" defaultValue={props.mailBcc} />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="mail_bcc_actief"
                    value="true"
                    defaultChecked={props.mailBccActief}
                    className="rounded border-gray-300 text-primary"
                  />
                  BCC actief
                </label>
              </div>
            </div>

            <h3 className="font-medium text-gray-900 pt-2">Broadcast-mail</h3>
            <div>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="broadcast_bcc_actief"
                  value="true"
                  defaultChecked={props.broadcastBccActief}
                  className="rounded border-gray-300 text-primary mt-0.5"
                />
                <span>
                  Ontvangers verbergen voor elkaar (BCC) <span className="text-gray-400">— aanbevolen</span>
                  <br />
                  <span className="text-xs text-gray-500">
                    Uitvinken betekent dat bij een broadcast-mail alle ontvangers-adressen voor elkaar
                    zichtbaar worden (in het aan-veld i.p.v. verborgen via BCC).
                  </span>
                </span>
              </label>
            </div>

            <h3 className="font-medium text-gray-900 pt-2">SMTP (fallback uitgaande mail)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="smtp_host" name="smtp_host" label="SMTP-host" placeholder="smtp.gmail.com" defaultValue={props.smtpHost} />
              <Input id="smtp_port" name="smtp_port" label="SMTP-poort" type="number" placeholder="587" defaultValue={props.smtpPort ?? ''} />
              <Input id="smtp_user" name="smtp_user" label="SMTP-gebruiker" defaultValue={props.smtpUser} />
              <Input
                id="smtp_pass"
                name="smtp_pass"
                label="SMTP-wachtwoord"
                type="password"
                placeholder={secretPlaceholder(props.smtpPassIsSet)}
              />
            </div>

            <h3 className="font-medium text-gray-900 pt-2">IMAP (inkomende mail)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="imap_host" name="imap_host" label="IMAP-host" placeholder="imap.gmail.com" defaultValue={props.imapHost} />
              <Input id="imap_port" name="imap_port" label="IMAP-poort" type="number" placeholder="993" defaultValue={props.imapPort ?? ''} />
              <Input id="imap_user" name="imap_user" label="IMAP-gebruiker" defaultValue={props.imapUser} />
              <Input
                id="imap_pass"
                name="imap_pass"
                label="IMAP-wachtwoord"
                type="password"
                placeholder={secretPlaceholder(props.imapPassIsSet)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
