'use client'

import { useState } from 'react'
import { createGebruiker, deleteGebruiker } from '@/lib/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, UserPlus } from 'lucide-react'

interface Gebruiker {
  id: string
  naam: string
  email: string
  rol: string
}

const rolLabels: Record<string, string> = {
  admin: 'Admin',
  gebruiker: 'Gebruiker',
  readonly: 'Alleen lezen',
}

export function GebruikersView({ gebruikers }: { gebruikers: Gebruiker[] }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showNewUser, setShowNewUser] = useState(false)

  async function handleCreateGebruiker(formData: FormData) {
    setLoading(true); setError(''); setSuccess('')
    const result = await createGebruiker(formData)
    if (result.error) setError(result.error)
    else {
      setSuccess('Gebruiker aangemaakt')
      setShowNewUser(false)
    }
    setLoading(false)
  }

  async function handleDeleteGebruiker(id: string) {
    if (!confirm('Weet u zeker dat u deze gebruiker wilt verwijderen?')) return
    setLoading(true); setError(''); setSuccess('')
    const result = await deleteGebruiker(id)
    if (result.error) setError(result.error)
    else setSuccess('Gebruiker verwijderd')
    setLoading(false)
  }

  return (
    <div>
      {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md mb-4">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">{error}</div>}

      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowNewUser(true)}>
          <UserPlus className="h-4 w-4" />
          Nieuwe gebruiker
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Naam</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">E-mail</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Rol</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">Acties</th>
              </tr>
            </thead>
            <tbody>
              {gebruikers.map((g) => (
                <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{g.naam}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{g.email}</td>
                  <td className="px-6 py-3"><Badge status={g.rol}>{rolLabels[g.rol] || g.rol}</Badge></td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleDeleteGebruiker(g.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {gebruikers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                    Geen gebruikers gevonden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showNewUser} onClose={() => setShowNewUser(false)} title="Nieuwe gebruiker">
        <form action={handleCreateGebruiker}>
          <div className="space-y-4">
            <Input id="new-naam" name="naam" label="Naam *" required />
            <Input id="new-email" name="email" label="E-mail *" type="email" required />
            <Input id="new-wachtwoord" name="wachtwoord" label="Wachtwoord *" type="password" required />
            <Select
              id="new-rol"
              name="rol"
              label="Rol"
              defaultValue="gebruiker"
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'gebruiker', label: 'Gebruiker' },
                { value: 'readonly', label: 'Alleen lezen' },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="stuur_email" value="true" defaultChecked className="rounded border-gray-300" />
              Stuur inloggegevens per e-mail
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowNewUser(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4" />
              {loading ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
