import { getAdministratie } from '@/lib/actions'
import { AlgemeenView } from './algemeen-view'

export default async function AlgemeenPage() {
  const administratie = await getAdministratie()
  return (
    <AlgemeenView
      standaardBtwPercentage={administratie?.standaard_btw_percentage ?? 21}
      standaardBetaaltermijnDagen={administratie?.standaard_betaaltermijn_dagen ?? 7}
    />
  )
}
