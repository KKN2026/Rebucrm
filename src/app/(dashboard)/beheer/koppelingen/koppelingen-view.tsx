'use client'

import { useState } from 'react'
import { saveInstellingenKoppelingen } from '@/lib/actions'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save } from 'lucide-react'

interface KoppelingenViewProps {
  mollieApiKeyIsSet: boolean
  snelstartClientKeyIsSet: boolean
  snelstartSubscriptionKeyIsSet: boolean
}

export function KoppelingenView(props: KoppelingenViewProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function handleSave(formData: FormData) {
    setLoading(true); setError(''); setSuccess('')
    const result = await saveInstellingenKoppelingen(formData)
    if (result.error) setError(result.error)
    else setSuccess('Koppelingen opgeslagen')
    setLoading(false)
  }

  const secretPlaceholder = (isSet: boolean) =>
    isSet ? '•••••••• (ingesteld — laat leeg om te behouden)' : 'Niet ingesteld'

  const snelstartActief = props.snelstartClientKeyIsSet && props.snelstartSubscriptionKeyIsSet

  return (
    <div className="space-y-6">
      {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}
      <p className="text-sm text-gray-500">
        Zonder deze instellingen wordt teruggevallen op de env-vars die in het hostingplatform zijn ingesteld.
        Leeg laten van een sleutelveld behoudt de huidige waarde.
      </p>

      <form action={handleSave}>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Mollie (betaallinks)</h3>
            <Badge status={props.mollieApiKeyIsSet ? 'actief' : 'niet_geconfigureerd'}>
              {props.mollieApiKeyIsSet ? 'Ingesteld' : 'Niet ingesteld'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Input
              id="mollie_api_key"
              name="mollie_api_key"
              label="Mollie API-key"
              type="password"
              placeholder={secretPlaceholder(props.mollieApiKeyIsSet)}
            />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">SnelStart (boekhoudkoppeling)</h3>
            <Badge status={snelstartActief ? 'actief' : 'niet_geconfigureerd'}>
              {snelstartActief ? 'Actief' : 'Niet ingesteld'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="snelstart_client_key"
                name="snelstart_client_key"
                label="SnelStart client key"
                type="password"
                placeholder={secretPlaceholder(props.snelstartClientKeyIsSet)}
              />
              <Input
                id="snelstart_subscription_key"
                name="snelstart_subscription_key"
                label="SnelStart subscription key"
                type="password"
                placeholder={secretPlaceholder(props.snelstartSubscriptionKeyIsSet)}
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
