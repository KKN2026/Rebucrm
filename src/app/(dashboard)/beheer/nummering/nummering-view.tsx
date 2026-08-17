'use client'

import { useState } from 'react'
import { saveNummering } from '@/lib/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

interface Nummering {
  id: string
  type: string
  prefix: string
  volgend_nummer: number
}

const typeLabels: Record<string, string> = {
  offerte: 'Offertes',
  order: 'Orders',
  factuur: 'Facturen',
  inkoopfactuur: 'Inkoopfacturen',
  boeking: 'Boekingen',
}

export function NummeringView({ nummering }: { nummering: Nummering[] }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function handleSaveNummering(formData: FormData) {
    setLoading(true); setError(''); setSuccess('')
    const result = await saveNummering(formData)
    if (result.error) setError(result.error)
    else setSuccess('Nummering opgeslagen')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}

      <div className="space-y-4">
        {nummering.map((n) => (
          <form key={n.id} action={handleSaveNummering}>
            <input type="hidden" name="id" value={n.id} />
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-gray-900 mb-3">{typeLabels[n.type] || n.type}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input id={`prefix-${n.id}`} name="prefix" label="Prefix" defaultValue={n.prefix} />
                  <Input id={`nummer-${n.id}`} name="volgend_nummer" label="Volgend nummer" type="number" defaultValue={n.volgend_nummer} />
                  <div className="flex items-end">
                    <Button type="submit" size="sm" disabled={loading}>
                      <Save className="h-3 w-3" />
                      Opslaan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        ))}
        {nummering.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Geen nummeringinstellingen gevonden. Deze worden automatisch aangemaakt bij registratie.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
