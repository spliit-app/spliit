import { AppRouterOutput } from '@/trpc/routers/_app'
import { createContext, PropsWithChildren, useContext } from 'react'

type GroupData = AppRouterOutput['groups']['get']

type GroupContext =
  | {
      isLoading: false
      groupId: string
      group: NonNullable<GroupData['group']>
      role: GroupData['role']
      participantId: GroupData['participantId']
    }
  | {
      isLoading: true
      groupId: string
      group: undefined
      role: undefined
      participantId: undefined
    }

const CurrentGroupContext = createContext<GroupContext | null>(null)

export const useCurrentGroup = () => {
  const context = useContext(CurrentGroupContext)
  if (!context)
    throw new Error(
      'Missing context. Should be called inside a CurrentGroupProvider.',
    )
  return context
}

/** The viewer is the group's owner: structural edits and member management. */
export const useIsGroupOwner = () => {
  const { role } = useCurrentGroup()
  return role === 'OWNER'
}

export const CurrentGroupProvider = ({
  children,
  ...props
}: PropsWithChildren<GroupContext>) => {
  return (
    <CurrentGroupContext.Provider value={props}>
      {children}
    </CurrentGroupContext.Provider>
  )
}
