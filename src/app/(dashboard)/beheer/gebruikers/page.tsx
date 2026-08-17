import { getGebruikers } from '@/lib/actions'
import { GebruikersView } from './gebruikers-view'

export default async function GebruikersPage() {
  const gebruikers = await getGebruikers()
  return <GebruikersView gebruikers={gebruikers} />
}
