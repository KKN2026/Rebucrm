'use client'

import { useState } from 'react'
import { saveAdministratie, uploadLogo, verwijderLogo } from '@/lib/actions'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save, Upload, Trash2 } from 'lucide-react'

interface Administratie {
  id: string
  naam: string
  kvk_nummer: string | null
  btw_nummer: string | null
  adres: string | null
  postcode: string | null
  plaats: string | null
  telefoon: string | null
  email: string | null
  website: string | null
  iban: string | null
  logo_url: string | null
}

export function BedrijfsgegevensView({ administratie }: { administratie: Administratie | null }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState(administratie?.logo_url || null)

  async function handleSave(formData: FormData) {
    setLoading(true); setError(''); setSuccess('')
    const result = await saveAdministratie(formData)
    if (result.error) setError(result.error)
    else setSuccess('Bedrijfsgegevens opgeslagen')
    setLoading(false)
  }

  async function handleUploadLogo(formData: FormData) {
    setLoading(true); setError(''); setSuccess('')
    const result = await uploadLogo(formData)
    if (result.error) setError(result.error)
    else {
      setSuccess('Logo geüpload')
      if (result.logo_url) setLogoUrl(result.logo_url)
    }
    setLoading(false)
  }

  async function handleVerwijderLogo() {
    if (!confirm('Logo verwijderen?')) return
    setLoading(true); setError(''); setSuccess('')
    const result = await verwijderLogo()
    if (result.error) setError(result.error)
    else {
      setSuccess('Logo verwijderd')
      setLogoUrl(null)
    }
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
              <Input id="naam" name="naam" label="Bedrijfsnaam *" defaultValue={administratie?.naam || ''} required />
              <Input id="kvk_nummer" name="kvk_nummer" label="KVK-nummer" defaultValue={administratie?.kvk_nummer || ''} />
              <Input id="btw_nummer" name="btw_nummer" label="BTW-nummer" defaultValue={administratie?.btw_nummer || ''} />
              <Input id="email" name="email" label="E-mail" type="email" defaultValue={administratie?.email || ''} />
              <Input id="telefoon" name="telefoon" label="Telefoon" defaultValue={administratie?.telefoon || ''} />
              <Input id="website" name="website" label="Website" defaultValue={administratie?.website || ''} />
              <Input id="adres" name="adres" label="Adres" defaultValue={administratie?.adres || ''} />
              <Input id="postcode" name="postcode" label="Postcode" defaultValue={administratie?.postcode || ''} />
              <Input id="plaats" name="plaats" label="Plaats" defaultValue={administratie?.plaats || ''} />
              <Input id="iban" name="iban" label="IBAN" defaultValue={administratie?.iban || ''} />
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

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-medium text-gray-900">Logo</h3>
          <p className="text-sm text-gray-500">
            Wordt gebruikt op offertes, facturen, in het klantenportaal en in e-mails.
          </p>
          {logoUrl && (
            <div className="flex items-center gap-4">
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50 inline-flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleVerwijderLogo} disabled={loading}>
                <Trash2 className="h-3.5 w-3.5" />
                Verwijderen
              </Button>
            </div>
          )}
          <form action={handleUploadLogo} className="flex items-center gap-3">
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              required
              className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-gray-300 file:bg-white file:text-sm file:cursor-pointer hover:file:bg-gray-50"
            />
            <Button type="submit" size="sm" disabled={loading}>
              <Upload className="h-3.5 w-3.5" />
              Uploaden
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
