'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Building2, SlidersHorizontal, Mail, Plug, ListOrdered, Users, Truck,
} from 'lucide-react'

const items = [
  { label: 'Bedrijfsgegevens', href: '/beheer/bedrijfsgegevens', icon: Building2 },
  { label: 'Algemeen', href: '/beheer/algemeen', icon: SlidersHorizontal },
  { label: 'E-mail', href: '/beheer/email', icon: Mail },
  { label: 'Koppelingen', href: '/beheer/koppelingen', icon: Plug },
  { label: 'Nummering', href: '/beheer/nummering', icon: ListOrdered },
  { label: 'Gebruikers', href: '/beheer/gebruikers', icon: Users },
  { label: 'Leveranciers', href: '/beheer/leveranciers', icon: Truck },
]

export function BeheerNav() {
  const pathname = usePathname()

  return (
    <nav className="w-56 flex-shrink-0">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
