'use client'

import { useState } from 'react'
import { saveInstellingenAlgemeen } from '@/lib/actions'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { btwPercentages } from '@/lib/constants'

export function AlgemeenView({ standaardBtwPercentage, standaardBetaaltermijnDagen }: {
  standaardBtwPercentage: number
  standaardBetaaltermijnDagen: number
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function handleSave(formData: FormData) {
    setLoading(true); setError(''); setSuccess('')
    const result = await saveInstellingenAlgemeen(formData)
    if (result.error) setError(result.error)
    else setSuccess('Instellingen opgeslagen')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}

      <form action={handleSave}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                id="standaard_btw_percentage"
                name="standaard_btw_percentage"
                label="Standaard BTW-percentage"
                defaultValue={String(standaardBtwPercentage)}
                options={btwPercentages.map(p => ({ value: String(p), label: `${p}%` }))}
              />
              <Input
                id="standaard_betaaltermijn_dagen"
                name="standaard_betaaltermijn_dagen"
                label="Standaard betaaltermijn (dagen)"
                type="number"
                min={1}
                max={90}
                defaultValue={standaardBetaaltermijnDagen}
              />
            </div>
            <p className="text-sm text-gray-500">
              Deze waarden worden gebruikt als standaard bij het aanmaken van nieuwe producten, offerte-/factuurregels
              en de vervaldatum van facturen, zolang er niet expliciet iets anders is opgegeven.
            </p>
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
