'use client'

import {
  RecentGroup,
  getRecentGroups,
  getStartupRedirectEnabled,
  setRecentGroups as saveRecentGroupsToStorage,
  setStartupRedirectEnabled,
} from '@/app/groups/recent-groups-helpers'
import { ImportJSONButton } from '@/components/import-json-button'
import { NewFeaturesDialog } from '@/components/new-features-dialog'
import { RestoreBackupButton } from '@/components/restore-backup-button'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { ASSOCIATED_GROUPS_KEY } from '@/lib/anonymous-constants'
import { trpc } from '@/trpc/client'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { Check, MoreVertical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const AUTH_STORAGE_KEY = 'anonymousAuthId'
const USERNAME_STORAGE_KEY = 'anonymousUsername'
const LINKED_STORAGE_KEY = 'anonymousLinked'

type AnonymousGroup = {
  groupId: string
  groupName: string
}

type Passkey = {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string
}

async function hashPassphrase(passphrase: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(passphrase)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

type PassphraseComplexity = {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

function checkPassphraseComplexity(passphrase: string): PassphraseComplexity {
  return {
    minLength: passphrase.length >= 8,
    hasUppercase: /[A-Z]/.test(passphrase),
    hasLowercase: /[a-z]/.test(passphrase),
    hasNumber: /[0-9]/.test(passphrase),
    hasSpecial: /[^A-Za-z0-9]/.test(passphrase),
  }
}

function isPassphraseValid(complexity: PassphraseComplexity): boolean {
  return (
    complexity.minLength &&
    complexity.hasUppercase &&
    complexity.hasLowercase &&
    complexity.hasNumber &&
    complexity.hasSpecial
  )
}

function generateUsername() {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const suffix = Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 10)
  return `anon-${suffix}`
}

function mergeRecentGroups(
  existing: RecentGroup[],
  incoming: AnonymousGroup[],
) {
  const merged = [...existing]
  for (const group of incoming) {
    if (!merged.some((item) => item.id === group.groupId)) {
      merged.push({ id: group.groupId, name: group.groupName })
    }
  }
  return merged
}

type PassphraseRequirement = {
  label: string
  met: boolean
}

function PassphraseComplexityIndicator({
  requirements,
}: {
  requirements: PassphraseRequirement[]
}) {
  return (
    <div className="space-y-1">
      {requirements.map((req) => (
        <div key={req.label} className="flex items-center gap-2 text-xs">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center ${
              req.met ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {req.met && <Check className="w-3 h-3 text-white" />}
          </div>
          <span
            className={
              req.met
                ? 'text-green-700 dark:text-green-400'
                : 'text-muted-foreground'
            }
          >
            {req.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AnonymousAuthMenu() {
  const t = useTranslations('AnonymousAuthMenu')
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [startupRedirect, setStartupRedirect] = useState(true)
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false)
  const [unlinkMode, setUnlinkMode] = useState<'signout' | 'delete' | null>(
    null,
  )
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showImportJSONDialog, setShowImportJSONDialog] = useState(false)
  const [showNewFeaturesDialog, setShowNewFeaturesDialog] = useState(false)
  const [authId, setAuthId] = useState<string | null>(null)
  const [pendingRefreshTarget, setPendingRefreshTarget] = useState<
    'groups' | 'refresh' | null
  >(null)
  const [removeGroupsOnUnlink, setRemoveGroupsOnUnlink] = useState(false)
  const [recentGroups, setRecentGroupsState] = useState<RecentGroup[]>([])
  const [associatedGroupIds, setAssociatedGroupIds] = useState<string[]>([])
  const [activeGroupIds, setActiveGroupIds] = useState<string[]>([])
  const [passphrase, setPassphrase] = useState('')
  const [currentPassphrase, setCurrentPassphrase] = useState('')
  const [newPassphrase, setNewPassphrase] = useState('')
  const [username, setUsername] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [isChangingPassphrase, setIsChangingPassphrase] = useState(false)
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false)
  const [isAuthenticatingPasskey, setIsAuthenticatingPasskey] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  const [usernameJustGenerated, setUsernameJustGenerated] = useState(false)
  const [isChangePassphraseMode, setIsChangePassphraseMode] = useState(false)
  const [isDeletingPasskey, setIsDeletingPasskey] = useState(false)
  const [showAddPasskeyDialog, setShowAddPasskeyDialog] = useState(false)
  const [newPasskeyName, setNewPasskeyName] = useState('')
  const [passkeyToDelete, setPasskeyToDelete] = useState<string | null>(null)
  const [isResettingWithPasskey, setIsResettingWithPasskey] = useState(false)
  const [passkeyResetMode, setPasskeyResetMode] = useState(false)
  const [hasExistingPassphrase, setHasExistingPassphrase] = useState(false)
  const preferRecover =
    !usernameJustGenerated &&
    username.trim().length > 0 &&
    passphrase.trim().length > 0

  const buildPassphraseRequirements = (
    complexity: PassphraseComplexity,
  ): PassphraseRequirement[] => [
    {
      label: t('passphrase.requirements.minLength'),
      met: complexity.minLength,
    },
    {
      label: t('passphrase.requirements.uppercase'),
      met: complexity.hasUppercase,
    },
    {
      label: t('passphrase.requirements.lowercase'),
      met: complexity.hasLowercase,
    },
    {
      label: t('passphrase.requirements.number'),
      met: complexity.hasNumber,
    },
    {
      label: t('passphrase.requirements.special'),
      met: complexity.hasSpecial,
    },
  ]

  const passphraseComplexity = useMemo(
    () => checkPassphraseComplexity(passphrase),
    [passphrase],
  )

  const newPassphraseComplexity = useMemo(
    () => checkPassphraseComplexity(newPassphrase),
    [newPassphrase],
  )

  const associatedGroups = useMemo(
    () => new Set(associatedGroupIds),
    [associatedGroupIds],
  )

  const activeGroupDetailsQuery = trpc.groups.list.useQuery(
    { groupIds: activeGroupIds },
    { enabled: open && isLinked && activeGroupIds.length > 0 },
  )

  const profileGroups = useMemo(() => {
    if (!isLinked) return []

    const groupsFromApi = activeGroupDetailsQuery.data?.groups
    if (groupsFromApi && groupsFromApi.length > 0) {
      return groupsFromApi.map((group) => ({ id: group.id, name: group.name }))
    }

    // Show groups that either have an active user OR are in the associated groups list
    return recentGroups.filter(
      (group) =>
        activeGroupIds.includes(group.id) ||
        associatedGroupIds.includes(group.id),
    )
  }, [
    recentGroups,
    activeGroupDetailsQuery.data?.groups,
    activeGroupIds,
    associatedGroupIds,
    isLinked,
  ])

  useEffect(() => {
    const existingAuthId = localStorage.getItem(AUTH_STORAGE_KEY)
    const nextAuthId = existingAuthId ?? crypto.randomUUID()
    if (!existingAuthId) {
      localStorage.setItem(AUTH_STORAGE_KEY, nextAuthId)
    }
    setAuthId(nextAuthId)

    const linkedStatus = localStorage.getItem(LINKED_STORAGE_KEY)
    const isUserLinked = linkedStatus === 'true'
    setIsLinked(isUserLinked)

    const storedUsername = localStorage.getItem(USERNAME_STORAGE_KEY)
    const nextUsername = storedUsername ?? generateUsername()
    if (!storedUsername) {
      localStorage.setItem(USERNAME_STORAGE_KEY, nextUsername)
    }

    // Only show username if user is already linked
    // When not linked (signing in), keep the field empty to avoid confusion
    // especially for passkey authentication
    if (isUserLinked) {
      setUsername(nextUsername)
    } else {
      setUsername('')
    }

    const storedAssociations = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
    setAssociatedGroupIds(
      storedAssociations ? (JSON.parse(storedAssociations) as string[]) : [],
    )

    setRecentGroupsState(getRecentGroups())
    setStartupRedirect(getStartupRedirectEnabled())

    void (async () => {
      try {
        const response = await fetch('/api/anonymous-users/ensure', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: nextAuthId, username: nextUsername }),
        })

        if (!response.ok) {
          toast({
            variant: 'destructive',
            title: t('toasts.initFailed.title'),
            description: t('toasts.initFailed.description'),
          })
        }
      } catch (error) {
        console.error(
          'Network error while initializing anonymous session',
          error,
        )
        toast({
          variant: 'destructive',
          title: t('toasts.initNetwork.title'),
          description: t('toasts.initNetwork.description'),
        })
      }
    })()
  }, [])

  useEffect(() => {
    if (!open) return
    setRecentGroupsState(getRecentGroups())

    const storedAssociations = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
    setAssociatedGroupIds(
      storedAssociations ? (JSON.parse(storedAssociations) as string[]) : [],
    )

    if (!isLinked) {
      setActiveGroupIds([])
      return
    }

    const nextActiveGroupIds = new Set<string>()
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !key.endsWith('-activeUser')) continue
      if (key === 'newGroup-activeUser') continue

      const groupId = key.replace(/-activeUser$/, '')
      const activeUser = localStorage.getItem(key)
      if (activeUser && activeUser !== 'None') {
        nextActiveGroupIds.add(groupId)
      }
    }

    setActiveGroupIds(Array.from(nextActiveGroupIds))
  }, [open, isLinked])

  // Fetch passkeys when dialog opens and user is linked
  useEffect(() => {
    if (!open || !isLinked || !authId) return

    void (async () => {
      try {
        const response = await fetch(
          `/api/anonymous-users/passkey/list?userId=${authId}`,
        )
        if (!response.ok) {
          console.error('Failed to fetch passkeys')
          return
        }
        const data = (await response.json()) as { passkeys: Passkey[] }
        setPasskeys(data.passkeys)
      } catch (error) {
        console.error('Error fetching passkeys:', error)
      }
    })()
  }, [open, isLinked, authId])

  useEffect(() => {
    if (!authId) return
    void (async () => {
      try {
        const response = await fetch(`/api/anonymous-users/groups?id=${authId}`)
        if (!response.ok) {
          toast({
            variant: 'destructive',
            title: t('toasts.syncGroupsFailed.title'),
            description: t('toasts.syncGroupsFailed.description'),
          })
          return
        }
        const data = (await response.json()) as {
          groups: AnonymousGroup[]
          passkeysEnabled?: boolean
          hasPassphrase?: boolean
        }

        // Update passphrase state
        setHasExistingPassphrase(data.hasPassphrase ?? false)

        const serverGroupIds = data.groups.map((group) => group.groupId)
        if (isLinked) {
          setAssociatedGroupIds(serverGroupIds)
          localStorage.setItem(
            ASSOCIATED_GROUPS_KEY,
            JSON.stringify(serverGroupIds),
          )
        }

        if (!data.groups.length) return

        const mergedGroups = mergeRecentGroups(getRecentGroups(), data.groups)
        saveRecentGroupsToStorage(mergedGroups)
        setRecentGroupsState(mergedGroups)

        if (!isLinked) {
          const storedAssociations = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
          setAssociatedGroupIds(
            storedAssociations
              ? (JSON.parse(storedAssociations) as string[])
              : [],
          )
        }
      } catch (error) {
        // Ensure failures are not silent and are visible to users and developers
        console.error('Failed to sync anonymous user groups', error)
        toast({
          variant: 'destructive',
          title: t('toasts.syncGroupsFailed.title'),
          description: t('toasts.syncGroupsFailed.description'),
        })
      }
    })()
  }, [authId, isLinked])

  useEffect(() => {
    if (open || !pendingRefreshTarget) return

    if (pendingRefreshTarget === 'groups') {
      window.location.assign('/groups')
    } else {
      router.refresh()
    }
    setPendingRefreshTarget(null)
  }, [open, pendingRefreshTarget, router])

  async function handleSaveAssociations() {
    if (!authId || !isLinked) return
    setIsSaving(true)
    try {
      const payload = profileGroups
        .filter((group) => associatedGroups.has(group.id))
        .map((group) => ({ groupId: group.id, groupName: group.name }))

      const response = await fetch('/api/anonymous-users/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: authId, groups: payload }),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string
        }

        if (response.status === 401) {
          toast({
            title: t('toasts.sessionExpired.title'),
            description: t('toasts.sessionExpired.saveAssociations'),
          })
        } else {
          toast({
            title: t('toasts.saveGroupsFailed.title'),
            description:
              errorData.error || t('toasts.saveGroupsFailed.description'),
          })
        }
        return
      }

      localStorage.setItem(
        ASSOCIATED_GROUPS_KEY,
        JSON.stringify(Array.from(associatedGroups)),
      )
      toast({
        title: t('toasts.groupsSaved.title'),
        description: t('toasts.groupsSaved.description'),
      })
    } catch (error) {
      console.error('Error saving group associations:', error)
      toast({
        title: t('toasts.networkError.title'),
        description: t('toasts.networkError.saveGroups'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSavePassphrase() {
    if (!authId || !passphrase.trim() || !username.trim()) return
    setIsSaving(true)
    try {
      const passphraseHash = await hashPassphrase(passphrase.trim())
      const response = await fetch('/api/anonymous-users/passphrase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: authId,
          username: username.trim(),
          passphraseHash,
        }),
      })

      if (!response.ok) {
        toast({
          title: t('toasts.passphraseInUse.title'),
          description: t('toasts.passphraseInUse.description'),
        })
        return
      }

      toast({
        title: t('toasts.accountSaved.title'),
        description: t('toasts.accountSaved.description'),
      })
      setPassphrase('')
      localStorage.setItem(USERNAME_STORAGE_KEY, username.trim())
      localStorage.setItem(LINKED_STORAGE_KEY, 'true')
      setIsLinked(true)
      refreshGroupsAfterLogin()
    } catch (error) {
      console.error('Error saving passphrase:', error)
      toast({
        title: t('toasts.networkError.title'),
        description: t('toasts.networkError.savePassphrase'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRecover() {
    if (!passphrase.trim() || !username.trim()) return
    setIsRecovering(true)
    try {
      const passphraseHash = await hashPassphrase(passphrase.trim())
      const response = await fetch('/api/anonymous-users/recover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          passphraseHash,
        }),
      })

      if (!response.ok) {
        toast({
          title: t('toasts.recoveryFailed.title'),
          description: t('toasts.recoveryFailed.description'),
        })
        return
      }

      const data = (await response.json()) as {
        id: string
        username: string | null
        groups: AnonymousGroup[]
      }

      localStorage.setItem(AUTH_STORAGE_KEY, data.id)
      setAuthId(data.id)
      if (data.username) {
        localStorage.setItem(USERNAME_STORAGE_KEY, data.username)
        setUsername(data.username)
      }

      const mergedGroups = mergeRecentGroups(getRecentGroups(), data.groups)
      saveRecentGroupsToStorage(mergedGroups) // Save to localStorage
      setRecentGroupsState(mergedGroups) // Update state

      const recoveredIds = data.groups.map((group) => group.groupId)
      setAssociatedGroupIds(recoveredIds)
      localStorage.setItem(ASSOCIATED_GROUPS_KEY, JSON.stringify(recoveredIds))

      toast({
        title: t('toasts.accountRecovered.title'),
        description: t('toasts.accountRecovered.description'),
      })
      setPassphrase('')
      localStorage.setItem(LINKED_STORAGE_KEY, 'true')
      setIsLinked(true)
      // Don't refresh - recovery sets up all state correctly
      // Just ensure the dialog will show updated groups by reopening
    } catch (error) {
      console.error('Error recovering account:', error)
      toast({
        title: t('toasts.networkError.title'),
        description: t('toasts.networkError.recoverAccount'),
      })
    } finally {
      setIsRecovering(false)
    }
  }

  async function handleChangePassphrase() {
    if (!authId || !newPassphrase.trim() || !username.trim()) return

    // Always require current passphrase for normal change flow
    if (!currentPassphrase.trim()) {
      toast({
        title: t('toasts.currentPassphraseRequired.title'),
        description: t('toasts.currentPassphraseRequired.description'),
      })
      return
    }

    setIsChangingPassphrase(true)
    const currentHash = await hashPassphrase(currentPassphrase.trim())
    const newHash = await hashPassphrase(newPassphrase.trim())

    const response = await fetch('/api/anonymous-users/passphrase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: authId,
        username: username.trim(),
        passphraseHash: newHash,
        currentPassphraseHash: currentHash,
      }),
    })
    setIsChangingPassphrase(false)

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      toast({
        title: t('toasts.updatePassphraseFailed.title'),
        description:
          errorData.error || t('toasts.updatePassphraseFailed.description'),
      })
      return
    }

    toast({
      title: t('toasts.passphraseUpdated.title'),
      description: t('toasts.passphraseUpdated.description'),
    })
    setCurrentPassphrase('')
    setNewPassphrase('')
    setIsChangePassphraseMode(false)
  }

  async function handleSetPassphraseAfterPasskeyAuth() {
    if (!authId || !newPassphrase.trim() || !username.trim()) return

    setIsChangingPassphrase(true)
    const newHash = await hashPassphrase(newPassphrase.trim())

    const response = await fetch('/api/anonymous-users/passphrase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: authId,
        username: username.trim(),
        passphraseHash: newHash,
        resetWithPasskey: true,
      }),
    })
    setIsChangingPassphrase(false)

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      toast({
        title: t('toasts.setPassphraseFailed.title'),
        description:
          errorData.error || t('toasts.setPassphraseFailed.description'),
      })
      return
    }

    toast({
      title: t('toasts.passphraseSet.title'),
      description: t('toasts.passphraseSet.description'),
    })
    setNewPassphrase('')
    setPasskeyResetMode(false)
    setHasExistingPassphrase(true)
  }

  async function handleResetPassphraseWithPasskey() {
    if (!authId || !username.trim()) {
      toast({
        title: t('toasts.accountRequired.title'),
        description: t('toasts.accountRequired.description'),
      })
      return
    }

    setIsResettingWithPasskey(true)

    try {
      // Get authentication options from the server
      const optionsResponse = await fetch(
        '/api/anonymous-users/passkey/auth-options',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: authId }),
        },
      )

      if (!optionsResponse.ok) {
        throw new Error(t('errors.authOptionsFailed'))
      }

      const options = (await optionsResponse.json()) as any

      // Start the authentication ceremony
      const authenticationResponse = await startAuthentication(options)

      // Verify the authentication with the server
      const verifyResponse = await fetch(
        '/api/anonymous-users/passkey/auth-verify',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            response: authenticationResponse,
            challenge: options.challenge,
          }),
        },
      )

      if (!verifyResponse.ok) {
        throw new Error(t('errors.authenticationFailed'))
      }

      // Authentication successful, enable passkey reset mode (no current passphrase needed)
      setPasskeyResetMode(true)
      setCurrentPassphrase('') // Clear any current passphrase field
      toast({
        title: t('toasts.authSuccess.title'),
        description: t('toasts.authSuccess.description'),
      })
    } catch (error) {
      console.error('Passkey authentication error:', error)
      toast({
        title: t('toasts.authFailed.title'),
        description:
          error instanceof Error
            ? error.message
            : t('toasts.authFailed.description'),
      })
    } finally {
      setIsResettingWithPasskey(false)
    }
  }

  async function handleDeletePasskey(passkeyId: string) {
    if (!authId) return
    setIsDeletingPasskey(true)

    try {
      const response = await fetch('/api/anonymous-users/passkey/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: authId, passkeyId }),
      })

      if (!response.ok) {
        throw new Error(t('errors.deletePasskeyFailed'))
      }

      // Refresh passkey list
      const listResponse = await fetch(
        `/api/anonymous-users/passkey/list?userId=${authId}`,
      )
      if (listResponse.ok) {
        const data = (await listResponse.json()) as { passkeys: Passkey[] }
        setPasskeys(data.passkeys)
      }

      setPasskeyToDelete(null)
      toast({
        title: t('toasts.passkeyRemoved.title'),
        description: t('toasts.passkeyRemoved.description'),
      })
    } catch (error) {
      console.error('Error deleting passkey:', error)
      toast({
        title: t('toasts.removePasskeyFailed.title'),
        description: t('toasts.removePasskeyFailed.description'),
      })
    } finally {
      setIsDeletingPasskey(false)
    }
  }

  function refreshGroupsAfterLogin() {
    if (pathname.startsWith('/groups')) {
      setPendingRefreshTarget('groups')
    } else {
      setPendingRefreshTarget('refresh')
    }
  }

  async function handleRegisterPasskey() {
    if (!authId || !username.trim()) {
      toast({
        title: t('toasts.usernameRequired.title'),
        description: t('toasts.usernameRequired.description'),
      })
      return
    }

    if (!newPasskeyName.trim()) {
      toast({
        title: t('toasts.passkeyNameRequired.title'),
        description: t('toasts.passkeyNameRequired.description'),
      })
      return
    }

    setIsRegisteringPasskey(true)

    try {
      // Get registration options from the server
      const optionsResponse = await fetch(
        '/api/anonymous-users/passkey/register-options',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: authId, username: username.trim() }),
        },
      )

      if (!optionsResponse.ok) {
        throw new Error(t('errors.registrationOptionsFailed'))
      }

      const options = (await optionsResponse.json()) as any

      // Start the registration ceremony
      const registrationResponse = await startRegistration(options)

      // Verify the registration with the server
      const verifyResponse = await fetch(
        '/api/anonymous-users/passkey/register-verify',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: authId,
            response: registrationResponse,
            challenge: options.challenge,
            name: newPasskeyName.trim(),
          }),
        },
      )

      if (!verifyResponse.ok) {
        throw new Error(t('errors.registrationVerifyFailed'))
      }

      // Refresh passkey list
      const listResponse = await fetch(
        `/api/anonymous-users/passkey/list?userId=${authId}`,
      )
      if (listResponse.ok) {
        const data = (await listResponse.json()) as { passkeys: Passkey[] }
        setPasskeys(data.passkeys)
      }

      localStorage.setItem(LINKED_STORAGE_KEY, 'true')
      setIsLinked(true)
      setShowAddPasskeyDialog(false)
      setNewPasskeyName('')
      toast({
        title: t('toasts.passkeyRegistered.title'),
        description: t('toasts.passkeyRegistered.description'),
      })
    } catch (error) {
      console.error('Passkey registration error:', error)
      toast({
        title: t('toasts.passkeyRegistrationFailed.title'),
        description:
          error instanceof Error
            ? error.message
            : t('toasts.passkeyRegistrationFailed.description'),
      })
    } finally {
      setIsRegisteringPasskey(false)
    }
  }

  async function handleAuthenticatePasskey() {
    setIsAuthenticatingPasskey(true)

    try {
      // Get authentication options from the server
      // Pass authId only when linked; otherwise try discoverable credentials first
      const optionsResponse = await fetch(
        '/api/anonymous-users/passkey/auth-options',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(
            isLinked
              ? { userId: authId || undefined }
              : username.trim()
                ? { username: username.trim() }
                : {},
          ),
        },
      )

      if (!optionsResponse.ok) {
        const errorData = (await optionsResponse.json().catch(() => ({}))) as {
          error?: string
        }

        // Handle specific error cases based on status code
        if (optionsResponse.status === 429) {
          toast({
            title: t('toasts.rateLimit.title'),
            description: t('toasts.rateLimit.description'),
            variant: 'destructive',
          })
          return
        }

        // Only show "not found" guidance when it's actually a not-found case
        if (!isLinked && !username.trim() && optionsResponse.status === 404) {
          toast({
            title: t('toasts.passkeyNotFound.title'),
            description: t('toasts.passkeyNotFound.description'),
          })
          return
        }

        // For other errors, use the error message from server or a generic message
        throw new Error(errorData.error || t('toasts.authFailed.generic'))
      }

      const options = (await optionsResponse.json()) as any

      // Start the authentication ceremony
      const authenticationResponse = await startAuthentication(options)

      // Verify the authentication with the server
      const verifyResponse = await fetch(
        '/api/anonymous-users/passkey/auth-verify',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            response: authenticationResponse,
            challenge: options.challenge,
          }),
        },
      )

      if (!verifyResponse.ok) {
        throw new Error(t('errors.authenticationFailed'))
      }

      const data = (await verifyResponse.json()) as {
        verified: boolean
        id: string
        username: string | null
        groups: AnonymousGroup[]
      }

      if (data.verified) {
        localStorage.setItem(AUTH_STORAGE_KEY, data.id)
        setAuthId(data.id)
        if (data.username) {
          localStorage.setItem(USERNAME_STORAGE_KEY, data.username)
          setUsername(data.username)
        }

        const mergedGroups = mergeRecentGroups(getRecentGroups(), data.groups)
        saveRecentGroupsToStorage(mergedGroups) // Save to localStorage
        setRecentGroupsState(mergedGroups) // Update state

        const recoveredIds = data.groups.map((group) => group.groupId)
        setAssociatedGroupIds(recoveredIds)
        localStorage.setItem(
          ASSOCIATED_GROUPS_KEY,
          JSON.stringify(recoveredIds),
        )

        localStorage.setItem(LINKED_STORAGE_KEY, 'true')
        setIsLinked(true)
        toast({
          title: t('toasts.passkeyLoginSuccess.title'),
          description: t('toasts.passkeyLoginSuccess.description'),
        })
        refreshGroupsAfterLogin()
      }
    } catch (error) {
      console.error('Passkey authentication error:', error)

      // Detect user cancellation (NotAllowedError)
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast({
          title: t('toasts.authCancelled.title'),
          description: t('toasts.authCancelled.description'),
        })
        return
      }

      // For not-linked users without username, suggest adding username
      if (!isLinked && !username.trim()) {
        toast({
          title: t('toasts.passkeyNotFound.title'),
          description: t('toasts.passkeyNotFound.description'),
        })
      } else {
        // For all other errors, show the actual error message
        toast({
          title: t('toasts.authFailed.title'),
          description:
            error instanceof Error
              ? error.message
              : t('toasts.authFailed.description'),
          variant: 'destructive',
        })
      }
    } finally {
      setIsAuthenticatingPasskey(false)
    }
  }

  function handleUnlink() {
    setShowUnlinkDialog(true)
  }

  async function handleConfirmUnlink(removeGroups: boolean) {
    setShowUnlinkDialog(false)

    // Note: Groups remain in database for account recovery
    // removeGroups only affects localStorage visibility

    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(USERNAME_STORAGE_KEY)
    localStorage.removeItem(LINKED_STORAGE_KEY)
    if (removeGroups) {
      localStorage.removeItem(ASSOCIATED_GROUPS_KEY)
      // Only remove associated groups from recent groups, keep others
      const remainingGroups = recentGroups.filter(
        (group) => !associatedGroupIds.includes(group.id),
      )
      saveRecentGroupsToStorage(remainingGroups)
      setRecentGroupsState(remainingGroups)
    } else {
      setRecentGroupsState(getRecentGroups())
    }
    setIsLinked(false)
    setPasskeys([])
    setAssociatedGroupIds([])

    const nextAuthId = crypto.randomUUID()
    localStorage.setItem(AUTH_STORAGE_KEY, nextAuthId)
    setAuthId(nextAuthId)

    const nextUsername = generateUsername()
    localStorage.setItem(USERNAME_STORAGE_KEY, nextUsername)
    setUsername(nextUsername)
    setUsernameJustGenerated(true)

    void fetch('/api/anonymous-users/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: nextAuthId, username: nextUsername }),
    })

    toast({
      title: t('toasts.unlinked.title'),
      description: removeGroups
        ? t('toasts.unlinked.descriptionRemoved')
        : t('toasts.unlinked.descriptionNew'),
    })

    if (removeGroups) {
      if (pathname.startsWith('/groups/')) {
        router.replace('/groups')
      } else {
        router.refresh()
      }
    } else {
      router.refresh()
    }
  }

  async function handleDeleteAccount(removeGroups: boolean) {
    if (!authId || !isLinked) return
    setShowUnlinkDialog(false)

    const response = await fetch('/api/anonymous-users/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: authId }),
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string
      }

      if (response.status === 401) {
        toast({
          title: t('toasts.sessionExpired.title'),
          description: t('toasts.sessionExpired.deleteAccount'),
        })
      } else {
        toast({
          title: t('toasts.deleteAccountFailed.title'),
          description:
            errorData.error || t('toasts.deleteAccountFailed.description'),
        })
      }
      return
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(USERNAME_STORAGE_KEY)
    localStorage.removeItem(LINKED_STORAGE_KEY)
    if (removeGroups) {
      localStorage.removeItem(ASSOCIATED_GROUPS_KEY)
      // Only remove associated groups from recent groups, keep others
      const remainingGroups = recentGroups.filter(
        (group) => !associatedGroupIds.includes(group.id),
      )
      saveRecentGroupsToStorage(remainingGroups)
      setRecentGroupsState(remainingGroups)
    } else {
      setRecentGroupsState(getRecentGroups())
    }
    setIsLinked(false)
    setPasskeys([])
    setAssociatedGroupIds([])

    const nextAuthId = crypto.randomUUID()
    localStorage.setItem(AUTH_STORAGE_KEY, nextAuthId)
    setAuthId(nextAuthId)

    const nextUsername = generateUsername()
    localStorage.setItem(USERNAME_STORAGE_KEY, nextUsername)
    setUsername(nextUsername)
    setUsernameJustGenerated(true)

    void fetch('/api/anonymous-users/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: nextAuthId, username: nextUsername }),
    })

    toast({
      title: t('toasts.accountDeleted.title'),
      description: removeGroups
        ? t('toasts.accountDeleted.descriptionRemoved')
        : t('toasts.accountDeleted.descriptionNew'),
    })

    if (removeGroups) {
      if (pathname.startsWith('/groups/')) {
        router.replace('/groups')
      } else {
        router.refresh()
      }
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            aria-label={t('menu.ariaLabel')}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => {
              setOpen(true)
            }}
          >
            {t('menu.account')}
          </DropdownMenuItem>
          {isLinked && (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  setShowRestoreDialog(true)
                }}
              >
                {t('menu.restoreBackup')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setShowImportJSONDialog(true)
                }}
              >
                {t('menu.importJson')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            onSelect={() => {
              setShowNewFeaturesDialog(true)
            }}
          >
            {t('menu.whatsNew')}
          </DropdownMenuItem>
          {isLinked && (
            <DropdownMenuItem
              onSelect={() => {
                setUnlinkMode('signout')
                setShowUnlinkDialog(true)
              }}
            >
              {t('menu.signOut')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.title')}</DialogTitle>
            <DialogDescription>{t('profile.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('profile.associatedGroups.title')}
              </h3>
              {profileGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('profile.associatedGroups.empty')}
                </p>
              ) : (
                <div className="space-y-2">
                  {profileGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Checkbox
                        checked={associatedGroups.has(group.id)}
                        onCheckedChange={(checked) => {
                          setAssociatedGroupIds((current) => {
                            const next = new Set(current)
                            if (checked === true) {
                              next.add(group.id)
                            } else {
                              next.delete(group.id)
                            }
                            return Array.from(next)
                          })
                        }}
                      />
                      <span className="truncate">{group.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <Button
                type="button"
                onClick={handleSaveAssociations}
                disabled={isSaving || !authId}
              >
                {isSaving
                  ? t('profile.associatedGroups.saving')
                  : t('profile.associatedGroups.save')}
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('profile.accountAccess.title')}
              </h3>
              {!isLinked ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (preferRecover) {
                      handleRecover()
                    } else {
                      handleSavePassphrase()
                    }
                  }}
                  className="space-y-3"
                >
                  <p className="text-sm text-muted-foreground">
                    {t('profile.accountAccess.description')}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value)
                        setUsernameJustGenerated(false)
                      }}
                      placeholder={t(
                        'profile.accountAccess.usernamePlaceholder',
                      )}
                      name="anonymous-username"
                      autoComplete="username"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const next = generateUsername()
                        setUsername(next)
                        setUsernameJustGenerated(true)
                        localStorage.setItem(USERNAME_STORAGE_KEY, next)
                      }}
                    >
                      {t('profile.accountAccess.generate')}
                    </Button>
                  </div>
                  <Input
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    placeholder={t(
                      'profile.accountAccess.passphrasePlaceholder',
                    )}
                    type="password"
                    name="anonymous-passphrase"
                    autoComplete={
                      preferRecover ? 'current-password' : 'new-password'
                    }
                  />
                  {passphrase.length > 0 && (
                    <PassphraseComplexityIndicator
                      requirements={buildPassphraseRequirements(
                        passphraseComplexity,
                      )}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type={preferRecover ? 'button' : 'submit'}
                      variant={preferRecover ? 'secondary' : 'default'}
                      onClick={
                        preferRecover
                          ? () => {
                              handleSavePassphrase()
                            }
                          : undefined
                      }
                      disabled={
                        isSaving ||
                        isRecovering ||
                        !passphrase.trim() ||
                        !authId ||
                        !username.trim() ||
                        !isPassphraseValid(passphraseComplexity)
                      }
                    >
                      {isSaving
                        ? t('profile.accountAccess.saving')
                        : t('profile.accountAccess.newAccount')}
                    </Button>
                    <Button
                      type={preferRecover ? 'submit' : 'button'}
                      variant={preferRecover ? 'default' : 'secondary'}
                      onClick={
                        preferRecover
                          ? undefined
                          : () => {
                              handleRecover()
                            }
                      }
                      disabled={
                        isSaving ||
                        isRecovering ||
                        !passphrase.trim() ||
                        !authId ||
                        !username.trim() ||
                        !isPassphraseValid(passphraseComplexity)
                      }
                    >
                      {isRecovering
                        ? t('profile.accountAccess.recovering')
                        : t('profile.accountAccess.existingAccount')}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {isChangePassphraseMode
                      ? t('profile.accountAccess.changePrompt')
                      : passkeyResetMode
                        ? t('profile.accountAccess.passkeyPrompt')
                        : t('profile.accountAccess.managePrompt')}
                  </p>
                  <div className="text-sm">
                    <label className="block text-xs font-semibold mb-2">
                      {t('profile.accountAccess.usernameLabel')}
                    </label>
                    <Input
                      value={username}
                      disabled
                      className="text-muted-foreground bg-muted"
                    />
                  </div>
                  {isChangePassphraseMode ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleChangePassphrase()
                      }}
                      className="space-y-3"
                    >
                      <Input
                        value={currentPassphrase}
                        onChange={(event) =>
                          setCurrentPassphrase(event.target.value)
                        }
                        placeholder={t(
                          'profile.accountAccess.currentPassphrasePlaceholder',
                        )}
                        type="password"
                        name="current-passphrase"
                        autoComplete="current-password"
                      />
                      <Input
                        value={newPassphrase}
                        onChange={(event) =>
                          setNewPassphrase(event.target.value)
                        }
                        placeholder={t(
                          'profile.accountAccess.newPassphrasePlaceholder',
                        )}
                        type="password"
                        name="new-passphrase"
                        autoComplete="new-password"
                      />
                      {newPassphrase.length > 0 && (
                        <PassphraseComplexityIndicator
                          requirements={buildPassphraseRequirements(
                            newPassphraseComplexity,
                          )}
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          disabled={
                            isChangingPassphrase ||
                            !currentPassphrase.trim() ||
                            !newPassphrase.trim() ||
                            !isPassphraseValid(newPassphraseComplexity)
                          }
                        >
                          {isChangingPassphrase
                            ? t('profile.accountAccess.updating')
                            : t('profile.accountAccess.changePassphrase')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsChangePassphraseMode(false)
                            setCurrentPassphrase('')
                            setNewPassphrase('')
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  ) : passkeyResetMode ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSetPassphraseAfterPasskeyAuth()
                      }}
                      className="space-y-3"
                    >
                      <Input
                        value={newPassphrase}
                        onChange={(event) =>
                          setNewPassphrase(event.target.value)
                        }
                        placeholder={t(
                          'profile.accountAccess.newPassphrasePlaceholder',
                        )}
                        type="password"
                        name="new-passphrase"
                        autoComplete="new-password"
                      />
                      {newPassphrase.length > 0 && (
                        <PassphraseComplexityIndicator
                          requirements={buildPassphraseRequirements(
                            newPassphraseComplexity,
                          )}
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          disabled={
                            isChangingPassphrase ||
                            !newPassphrase.trim() ||
                            !isPassphraseValid(newPassphraseComplexity)
                          }
                        >
                          {isChangingPassphrase
                            ? t('profile.accountAccess.setting')
                            : t('profile.accountAccess.setPassphrase')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPasskeyResetMode(false)
                            setNewPassphrase('')
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {hasExistingPassphrase ? (
                        <Button
                          type="button"
                          onClick={() => setIsChangePassphraseMode(true)}
                        >
                          {t('profile.accountAccess.changePassphrase')}
                        </Button>
                      ) : passkeys.length > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResetPassphraseWithPasskey}
                          disabled={isResettingWithPasskey}
                        >
                          {isResettingWithPasskey
                            ? t('profile.accountAccess.authenticating')
                            : t('profile.accountAccess.setWithPasskey')}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t('profile.accountAccess.passkeyFirst')}
                        </p>
                      )}
                      {hasExistingPassphrase && passkeys.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResetPassphraseWithPasskey}
                          disabled={isResettingWithPasskey}
                        >
                          {isResettingWithPasskey
                            ? t('profile.accountAccess.authenticating')
                            : t('profile.accountAccess.resetWithPasskey')}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('profile.passkeyLogin.title')}
              </h3>
              {!isLinked ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.passkeyLogin.notLinkedDescription')}
                  </p>
                  <Button
                    type="button"
                    onClick={handleAuthenticatePasskey}
                    disabled={isAuthenticatingPasskey}
                  >
                    {isAuthenticatingPasskey
                      ? t('profile.passkeyLogin.authenticating')
                      : t('profile.passkeyLogin.usePasskey')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {passkeys.length > 0
                      ? t('profile.passkeyLogin.manageDescription')
                      : t('profile.passkeyLogin.addDescription')}
                  </p>
                  {passkeys.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {passkeys.map((passkey) => (
                        <div
                          key={passkey.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {passkey.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('profile.passkeyLogin.created', {
                                date: new Date(
                                  passkey.createdAt,
                                ).toLocaleDateString(),
                              })}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPasskeyToDelete(passkey.id)}
                          >
                            {t('profile.passkeyLogin.remove')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    onClick={() => setShowAddPasskeyDialog(true)}
                    disabled={!authId || !username.trim()}
                  >
                    {t('profile.passkeyLogin.addPasskey')}
                  </Button>
                </>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('profile.preferences.title')}
              </h3>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <Checkbox
                  checked={startupRedirect}
                  onCheckedChange={(checked) => {
                    const next = checked === true
                    setStartupRedirect(next)
                    setStartupRedirectEnabled(next)
                  }}
                  className="mt-0.5"
                />
                <div>
                  <p>{t('profile.preferences.startupRedirect')}</p>
                  <p className="text-muted-foreground text-xs">
                    {t('profile.preferences.startupRedirectDescription')}
                  </p>
                </div>
              </label>
            </div>

            {isLinked && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">
                  {t('profile.profileActions.title')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setUnlinkMode('delete')
                      setShowUnlinkDialog(true)
                    }}
                  >
                    {t('profile.profileActions.deleteAccount')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUnlinkDialog}
        onOpenChange={(open) => {
          setShowUnlinkDialog(open)
          if (!open) setUnlinkMode(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {unlinkMode === 'signout'
                ? t('unlinkDialog.signOutTitle')
                : t('unlinkDialog.deleteTitle')}
            </DialogTitle>
            <DialogDescription>
              {unlinkMode === 'signout'
                ? t('unlinkDialog.signOutDescription')
                : t('unlinkDialog.deleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {t('unlinkDialog.associatedGroupsTitle')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={removeGroupsOnUnlink ? 'outline' : 'default'}
                  onClick={() => setRemoveGroupsOnUnlink(false)}
                >
                  {t('unlinkDialog.keepRecent')}
                </Button>
                <Button
                  type="button"
                  variant={removeGroupsOnUnlink ? 'default' : 'outline'}
                  onClick={() => setRemoveGroupsOnUnlink(true)}
                >
                  {t('unlinkDialog.removeRecent')}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowUnlinkDialog(false)}
                >
                  {t('common.cancel')}
                </Button>
                {unlinkMode === 'signout' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleConfirmUnlink(removeGroupsOnUnlink)}
                  >
                    {t('unlinkDialog.signOutAction')}
                  </Button>
                )}
                {unlinkMode === 'delete' && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDeleteAccount(removeGroupsOnUnlink)}
                  >
                    {t('unlinkDialog.deleteAction')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showRestoreDialog && (
        <RestoreBackupButton
          open={showRestoreDialog}
          onOpenChange={setShowRestoreDialog}
        />
      )}

      {showImportJSONDialog && (
        <ImportJSONButton
          open={showImportJSONDialog}
          onOpenChange={setShowImportJSONDialog}
        />
      )}

      <NewFeaturesDialog
        open={showNewFeaturesDialog}
        onOpenChange={setShowNewFeaturesDialog}
      />

      <Dialog
        open={showAddPasskeyDialog}
        onOpenChange={setShowAddPasskeyDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addPasskey.title')}</DialogTitle>
            <DialogDescription>{t('addPasskey.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={newPasskeyName}
                onChange={(e) => setNewPasskeyName(e.target.value)}
                placeholder={t('addPasskey.placeholder')}
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddPasskeyDialog(false)
                  setNewPasskeyName('')
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={isRegisteringPasskey || !newPasskeyName.trim()}
              >
                {isRegisteringPasskey
                  ? t('addPasskey.registering')
                  : t('addPasskey.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passkeyToDelete !== null}
        onOpenChange={(open) => !open && setPasskeyToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('removePasskey.title')}</DialogTitle>
            <DialogDescription>
              {t('removePasskey.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPasskeyToDelete(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                passkeyToDelete && handleDeletePasskey(passkeyToDelete)
              }
              disabled={isDeletingPasskey}
            >
              {isDeletingPasskey
                ? t('removePasskey.removing')
                : t('removePasskey.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
