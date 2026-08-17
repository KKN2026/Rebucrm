import { getAdministratie } from '@/lib/actions'
import { EmailView } from './email-view'

export default async function EmailPage() {
  const administratie = await getAdministratie()

  // Secret-velden (wachtwoorden) worden NIET als waarde naar de client
  // component doorgegeven — alleen een boolean "is ingesteld", zodat er geen
  // wachtwoord in de HTML/React-payload terechtkomt.
  return (
    <EmailView
      smtpHost={administratie?.smtp_host || ''}
      smtpPort={administratie?.smtp_port || null}
      smtpUser={administratie?.smtp_user || ''}
      smtpPassIsSet={Boolean(administratie?.smtp_pass)}
      smtpFrom={administratie?.smtp_from || ''}
      mailBcc={administratie?.mail_bcc || ''}
      mailBccActief={administratie?.mail_bcc_actief ?? true}
      imapHost={administratie?.imap_host || ''}
      imapPort={administratie?.imap_port || null}
      imapUser={administratie?.imap_user || ''}
      imapPassIsSet={Boolean(administratie?.imap_pass)}
    />
  )
}
