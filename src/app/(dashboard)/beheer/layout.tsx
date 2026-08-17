import { PageHeader } from '@/components/ui/page-header'
import { BeheerNav } from './beheer-nav'

export default function BeheerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Beheer" description="Instellingen en configuratie" />
      <div className="flex gap-6 items-start">
        <BeheerNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
