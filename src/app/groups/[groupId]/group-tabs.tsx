'use client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  BarChart2,
  Info,
  MoreHorizontal,
  Receipt,
  Scale,
  Settings,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  groupId: string
}

const NAV_ITEMS = [
  { value: 'expenses', Icon: Receipt },
  { value: 'balances', Icon: Scale },
  { value: 'information', Icon: Info },
  { value: 'stats', Icon: BarChart2 },
  { value: 'activity', Icon: Activity },
  { value: 'edit', Icon: Settings },
] as const

const MOBILE_PRIMARY_ITEMS = ['expenses', 'balances', 'stats'] as const
const MOBILE_MORE_ITEMS = ['information', 'activity', 'edit'] as const

export function GroupTabs({ groupId }: Props) {
  const t = useTranslations()
  const pathname = usePathname()
  const value =
    pathname.replace(/\/groups\/[^\/]+\/([^/]+).*/, '$1') || 'expenses'
  const router = useRouter()

  const tabLabels: Record<string, string> = {
    expenses: t('Expenses.title'),
    balances: t('Balances.title'),
    information: t('Information.title'),
    stats: t('Stats.title'),
    activity: t('Activity.title'),
    edit: t('Settings.title'),
  }

  const navigate = (value: string) => {
    router.push(`/groups/${groupId}/${value}`)
  }

  const mobilePrimaryItems = NAV_ITEMS.filter(({ value }) =>
    MOBILE_PRIMARY_ITEMS.includes(
      value as (typeof MOBILE_PRIMARY_ITEMS)[number],
    ),
  )
  const mobileMoreItems = NAV_ITEMS.filter(({ value }) =>
    MOBILE_MORE_ITEMS.includes(value as (typeof MOBILE_MORE_ITEMS)[number]),
  )
  const isMoreActive = MOBILE_MORE_ITEMS.includes(
    value as (typeof MOBILE_MORE_ITEMS)[number],
  )

  return (
    <>
      {/* Desktop tab bar — hidden on mobile */}
      <Tabs
        value={value}
        className="[&>*]:border overflow-x-auto hidden sm:block"
        onValueChange={navigate}
      >
        <TabsList>
          {NAV_ITEMS.map(({ value: v }) => (
            <TabsTrigger key={v} value={v}>
              {tabLabels[v]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Mobile bottom navigation bar — fixed, hidden on sm+ */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t">
        <div
          className="flex h-20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {mobilePrimaryItems.map(({ value: v, Icon }) => {
            const isActive = value === v
            return (
              <button
                key={v}
                onClick={() => navigate(v)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`}
                />
                <span className="text-xs leading-none font-medium">
                  {tabLabels[v]}
                </span>
              </button>
            )
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation ${
                  isMoreActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                }`}
              >
                <MoreHorizontal
                  className={`w-6 h-6 transition-transform ${isMoreActive ? 'scale-110' : ''}`}
                />
                <span className="text-xs leading-none font-medium">
                  {t('Groups.mobileMore')}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={12}
              className="w-48"
            >
              {mobileMoreItems.map(({ value: v, Icon }) => {
                const isActive = value === v
                return (
                  <DropdownMenuItem
                    key={v}
                    onClick={() => navigate(v)}
                    className={
                      isActive ? 'bg-accent text-accent-foreground' : ''
                    }
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tabLabels[v]}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </>
  )
}
