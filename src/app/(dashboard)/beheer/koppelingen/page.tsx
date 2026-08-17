import { getAdministratie } from '@/lib/actions'
import { KoppelingenView } from './koppelingen-view'

export default async function KoppelingenPage() {
  const administratie = await getAdministratie()

  // Secret-velden (API-sleutels) worden NIET als waarde naar de client
  // component doorgegeven — alleen een boolean "is ingesteld".
  return (
    <KoppelingenView
      mollieApiKeyIsSet={Boolean(administratie?.mollie_api_key)}
      snelstartClientKeyIsSet={Boolean(administratie?.snelstart_client_key)}
      snelstartSubscriptionKeyIsSet={Boolean(administratie?.snelstart_subscription_key)}
    />
  )
}
