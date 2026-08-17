import { getAdministratie } from '@/lib/actions'
import { BedrijfsgegevensView } from './bedrijfsgegevens-view'

export default async function BedrijfsgegevensPage() {
  const administratie = await getAdministratie()
  return <BedrijfsgegevensView administratie={administratie} />
}
