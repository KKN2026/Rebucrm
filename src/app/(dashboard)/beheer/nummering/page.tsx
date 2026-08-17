import { getNummering } from '@/lib/actions'
import { NummeringView } from './nummering-view'

export default async function NummeringPage() {
  const nummering = await getNummering()
  return <NummeringView nummering={nummering} />
}
