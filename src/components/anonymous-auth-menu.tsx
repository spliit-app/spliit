'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  RecentGroup,
  getRecentGroups,
  setRecentGroups,
} from '@/app/groups/recent-groups-helpers'
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
import { MoreVertical, Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'

const AUTH_STORAGE_KEY = 'anonymousAuthId'
const ASSOCIATED_GROUPS_KEY = 'anonymousAssociatedGroups'
const USERNAME_STORAGE_KEY = 'anonymousUsername'
const LINKED_STORAGE_KEY = 'anonymousLinked'

type AnonymousGroup = {
  groupId: string
  groupName: string
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

function PassphraseComplexityIndicator({ complexity }: { complexity: PassphraseComplexity }) {
  const requirements = [
    { label: 'At least 8 characters', met: complexity.minLength },
    { label: 'One uppercase letter', met: complexity.hasUppercase },
    { label: 'One lowercase letter', met: complexity.hasLowercase },
    { label: 'One number', met: complexity.hasNumber },
    { label: 'One special character', met: complexity.hasSpecial },
  ]

  return (
    <div className="space-y-1">
      {requirements.map((req) => (
        <div key={req.label} className="flex items-center gap-2 text-xs">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
            {req.met && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className={req.met ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AnonymousAuthMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false)
  const [authId, setAuthId] = useState<string | null>(null)
  const [pendingRefreshTarget, setPendingRefreshTarget] = useState<
    'groups' | 'refresh' | null
  >(null)
  const [removeGroupsOnUnlink, setRemoveGroupsOnUnlink] = useState(false)
  const [recentGroups, setRecentGroupsState] = useState<RecentGroup[]>([])
  const [associatedGroupIds, setAssociatedGroupIds] = useState<string[]>([])
  const [passphrase, setPassphrase] = useState('')
  const [currentPassphrase, setCurrentPassphrase] = useState('')
  const [newPassphrase, setNewPassphrase] = useState('')
  const [username, setUsername] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [isChangingPassphrase, setIsChangingPassphrase] = useState(false)
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false)
  const [isAuthenticatingPasskey, setIsAuthenticatingPasskey] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  const [usernameJustGenerated, setUsernameJustGenerated] = useState(false)
  const [isChangePassphraseMode, setIsChangePassphraseMode] = useState(false)
  const [isDeletingPasskey, setIsDeletingPasskey] = useState(false)
  const preferRecover = !usernameJustGenerated && username.trim().length > 0 && passphrase.trim().length > 0

  const passphraseComplexity = useMemo(
    () => checkPassphraseComplexity(passphrase),
    [passphrase]
  )
  
  const newPassphraseComplexity = useMemo(
    () => checkPassphraseComplexity(newPassphrase),
    [newPassphrase]
  )

  const associatedGroups = useMemo(
    () => new Set(associatedGroupIds),
    [associatedGroupIds],
  )

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

    void (async () => {
      try {
        const response = await fetch('/api/anonymous-users/ensure', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: nextAuthId, username: nextUsername }),
        })

        if (!response.ok) {
          toast({
            variant: 'destructive',
            title: 'Unable to initialize anonymous session',
            description: 'Please try refreshing the page. If the problem persists, try again later.',
          })
        }
      } catch (error) {
        console.error('Network error while initializing anonymous session', error)
        toast({
          variant: 'destructive',
          title: 'Network error while initializing',
          description: 'Check your connection and refresh the page to try again.',
        })
      }
    })()
  }, [])

  useEffect(() => {
    if (!authId) return
    void (async () => {
      try {
        const response = await fetch(`/api/anonymous-users/groups?id=${authId}`)
        if (!response.ok) {
          toast({
            variant: 'destructive',
            title: 'Failed to sync groups',
            description: 'We could not load your groups. Your local groups list may be out of date.',
          })
          return
        }
        const data = (await response.json()) as { groups: AnonymousGroup[]; passkeysEnabled?: boolean }
        if (!data.groups.length) return

        const mergedGroups = mergeRecentGroups(getRecentGroups(), data.groups)
        setRecentGroups(mergedGroups)
        setRecentGroupsState(mergedGroups)

        const storedAssociations = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
        const storedIds = storedAssociations ? (JSON.parse(storedAssociations) as string[]) : []
        const mergedIds = Array.from(
          new Set([...storedIds, ...data.groups.map((group) => group.groupId)]),
        )
        setAssociatedGroupIds(mergedIds)
        localStorage.setItem(ASSOCIATED_GROUPS_KEY, JSON.stringify(mergedIds))

        if (data.passkeysEnabled) {
          setPasskeyEnabled(true)
        }
      } catch (error) {
        // Ensure failures are not silent and are visible to users and developers
        console.error('Failed to sync anonymous user groups', error)
        toast({
          variant: 'destructive',
          title: 'Failed to sync groups',
          description: 'We could not load your groups. Your local groups list may be out of date.',
        })
      }
    })()
  }, [authId])

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
    if (!authId) return
    setIsSaving(true)
    const payload = recentGroups
      .filter((group) => associatedGroups.has(group.id))
      .map((group) => ({ groupId: group.id, groupName: group.name }))

    const response = await fetch('/api/anonymous-users/groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: authId, groups: payload }),
    })

    setIsSaving(false)

    if (!response.ok) {
      toast({
        title: 'Failed to save groups',
        description: 'Please try again.',
      })
      return
    }

    localStorage.setItem(
      ASSOCIATED_GROUPS_KEY,
      JSON.stringify(Array.from(associatedGroups)),
    )
    toast({
      title: 'Groups saved',
      description: 'These groups are now linked to your anonymous account.',
    })
  }

  async function handleSavePassphrase() {
    if (!authId || !passphrase.trim() || !username.trim()) return
    setIsSaving(true)
    const passphraseHash = await hashPassphrase(passphrase.trim())
    const response = await fetch('/api/anonymous-users/passphrase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: authId,
        username: username.trim(),
        passphraseHash,
      }),
    })
    setIsSaving(false)

    if (!response.ok) {
      toast({
        title: 'Passphrase already in use',
        description: 'Choose a different passphrase and try again.',
      })
      return
    }

    toast({
      title: 'Account saved',
      description: 'Use this username and passphrase to recover later.',
    })
    setPassphrase('')
    localStorage.setItem(USERNAME_STORAGE_KEY, username.trim())
    localStorage.setItem(LINKED_STORAGE_KEY, 'true')
    setIsLinked(true)
    refreshGroupsAfterLogin()
  }

  async function handleRecover() {
    if (!passphrase.trim() || !username.trim()) return
    setIsRecovering(true)
    const passphraseHash = await hashPassphrase(passphrase.trim())
    const response = await fetch('/api/anonymous-users/recover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        passphraseHash,
      }),
    })
    setIsRecovering(false)

    if (!response.ok) {
      toast({
        title: 'Recovery failed',
        description: 'No account was found for that passphrase.',
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
    setRecentGroups(mergedGroups)
    setRecentGroupsState(mergedGroups)

    const recoveredIds = data.groups.map((group) => group.groupId)
    setAssociatedGroupIds(recoveredIds)
    localStorage.setItem(ASSOCIATED_GROUPS_KEY, JSON.stringify(recoveredIds))

    toast({
      title: 'Account recovered',
      description: 'Your associated groups were restored on this device.',
    })
    setPassphrase('')
    localStorage.setItem(LINKED_STORAGE_KEY, 'true')
    setIsLinked(true)
    refreshGroupsAfterLogin()
  }

  async function handleChangePassphrase() {
    if (!authId || !currentPassphrase.trim() || !newPassphrase.trim() || !username.trim()) return
    setIsChangingPassphrase(true)
    const currentHash = await hashPassphrase(currentPassphrase.trim())
    const newHash = await hashPassphrase(newPassphrase.trim())

    const response = await fetch('/api/anonymous-users/passphrase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: authId,
        username: username.trim(),
        passphraseHash: newHash,
        currentPassphraseHash: currentHash,
      }),
    })
    setIsChangingPassphrase(false)

    if (!response.ok) {
      toast({
        title: 'Current passphrase incorrect',
        description: 'Please verify your current passphrase and try again.',
      })
      return
    }

    toast({
      title: 'Passphrase updated',
      description: 'Your new passphrase is now active.',
    })
    setCurrentPassphrase('')
    setNewPassphrase('')
    setIsChangePassphraseMode(false)
  }

  async function handleDeletePasskey() {
    if (!authId) return
    setIsDeletingPasskey(true)

    try {
      const response = await fetch('/api/anonymous-users/passkey/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: authId }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete passkey')
      }

      setPasskeyEnabled(false)
      toast({
        title: 'Passkey removed',
        description: 'You can register a new passkey anytime.',
      })
    } catch (error) {
      console.error('Error deleting passkey:', error)
      toast({
        title: 'Failed to remove passkey',
        description: 'Please try again.',
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
        title: 'Username required',
        description: 'Please set a username before registering a passkey.',
      })
      return
    }

    setIsRegisteringPasskey(true)

    try {
      // Get registration options from the server
      const optionsResponse = await fetch('/api/anonymous-users/passkey/register-options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: authId, username: username.trim() }),
      })

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options')
      }

      const options = (await optionsResponse.json()) as PublicKeyCredentialCreationOptionsJSON

      // Start the registration ceremony
      const registrationResponse = await startRegistration(options)

      // Verify the registration with the server
      const verifyResponse = await fetch('/api/anonymous-users/passkey/register-verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: authId,
          response: registrationResponse,
          challenge: options.challenge,
        }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify registration')
      }

      setPasskeyEnabled(true)
      localStorage.setItem(LINKED_STORAGE_KEY, 'true')
      setIsLinked(true)
      toast({
        title: 'Passkey registered',
        description: 'You can now use your passkey to log in.',
      })
    } catch (error) {
      console.error('Passkey registration error:', error)
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsRegisteringPasskey(false)
    }
  }

  async function handleAuthenticatePasskey() {
    setIsAuthenticatingPasskey(true)

    try {
      // Get authentication options from the server
      // Pass authId if available, otherwise use discoverable credentials
      const optionsResponse = await fetch('/api/anonymous-users/passkey/auth-options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: authId || undefined }),
      })

      if (!optionsResponse.ok) {
        throw new Error('No passkey registered for this account')
      }

      const options = (await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON

      // Start the authentication ceremony
      const authenticationResponse = await startAuthentication(options)

      // Verify the authentication with the server
      const verifyResponse = await fetch('/api/anonymous-users/passkey/auth-verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          response: authenticationResponse,
          challenge: options.challenge,
        }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Authentication failed')
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
        setRecentGroups(mergedGroups)
        setRecentGroupsState(mergedGroups)

        const recoveredIds = data.groups.map((group) => group.groupId)
        setAssociatedGroupIds(recoveredIds)
        localStorage.setItem(ASSOCIATED_GROUPS_KEY, JSON.stringify(recoveredIds))

        setPasskeyEnabled(true)
        localStorage.setItem(LINKED_STORAGE_KEY, 'true')
        setIsLinked(true)
        toast({
          title: 'Logged in with passkey',
          description: 'Your associated groups were restored on this device.',
        })
        refreshGroupsAfterLogin()
      }
    } catch (error) {
      console.error('Passkey authentication error:', error)
      toast({
        title: 'Authentication failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsAuthenticatingPasskey(false)
    }
  }

  function handleUnlink() {
    setShowUnlinkDialog(true)
  }

  async function handleConfirmUnlink(removeGroups: boolean) {
    setShowUnlinkDialog(false)
    
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(USERNAME_STORAGE_KEY)
    localStorage.removeItem(LINKED_STORAGE_KEY)
    if (removeGroups) {
      localStorage.removeItem(ASSOCIATED_GROUPS_KEY)
      setRecentGroups([])
    }
    setRecentGroupsState(removeGroups ? [] : getRecentGroups())
    setIsLinked(false)
    setPasskeyEnabled(false)
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
      body: JSON.stringify({ id: nextAuthId, username: nextUsername }),
    })
    
    toast({
      title: 'Unlinked from device',
      description: removeGroups
        ? 'Associated groups have been removed from your device.'
        : 'You are now using a new anonymous account on this device.',
    })

    if (removeGroups && pathname.startsWith('/groups/')) {
      router.replace('/groups')
    } else {
      router.refresh()
    }
  }

  async function handleDeleteAccount(removeGroups: boolean) {
    if (!authId) return
    setShowUnlinkDialog(false)

    const response = await fetch('/api/anonymous-users/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: authId }),
    })

    if (!response.ok) {
      toast({
        title: 'Failed to delete account',
        description: 'Please try again.',
      })
      return
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(USERNAME_STORAGE_KEY)
    localStorage.removeItem(LINKED_STORAGE_KEY)
    if (removeGroups) {
      localStorage.removeItem(ASSOCIATED_GROUPS_KEY)
      setRecentGroups([])
    }
    setRecentGroupsState(removeGroups ? [] : getRecentGroups())
    setIsLinked(false)
    setPasskeyEnabled(false)
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
      body: JSON.stringify({ id: nextAuthId, username: nextUsername }),
    })

    toast({
      title: 'Account deleted',
      description: removeGroups
        ? 'Account deleted and groups removed from this device.'
        : 'Account deleted. You are now using a new anonymous account on this device.',
    })

    if (removeGroups && pathname.startsWith('/groups/')) {
      router.replace('/groups')
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
            aria-label="Anonymous account"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Anonymous account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymous account</DialogTitle>
            <DialogDescription>
              Link groups to this device or recover them on another device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Associated groups</h3>
              {recentGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Visit or add a group first to associate it.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentGroups.map((group) => (
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
                {isSaving ? 'Saving…' : 'Save associations'}
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Account access</h3>
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
                    Use the same username and passphrase to create or recover your
                    anonymous account.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value)
                        setUsernameJustGenerated(false)
                      }}
                      placeholder="Anonymous username"
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
                      Generate
                    </Button>
                  </div>
                  <Input
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    placeholder="Enter a passphrase"
                    type="password"
                    name="anonymous-passphrase"
                    autoComplete={preferRecover ? "current-password" : "new-password"}
                  />
                  {passphrase.length > 0 && (
                    <PassphraseComplexityIndicator complexity={passphraseComplexity} />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant={preferRecover ? 'secondary' : 'default'}
                      disabled={
                        isSaving ||
                        !passphrase.trim() ||
                        !authId ||
                        !username.trim() ||
                        !isPassphraseValid(passphraseComplexity)
                      }
                    >
                      {isSaving ? 'Saving…' : 'New account'}
                    </Button>
                    <Button
                      type="button"
                      variant={preferRecover ? 'default' : 'secondary'}
                      onClick={handleRecover}
                      disabled={
                        isRecovering || !passphrase.trim() || !username.trim()
                      }
                    >
                      {isRecovering ? 'Recovering…' : 'Recover account'}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {isChangePassphraseMode
                      ? 'Enter your current passphrase and choose a new one.'
                      : 'Manage your account security.'}
                  </p>
                  <div className="text-sm">
                    <label className="block text-xs font-semibold mb-2">Username</label>
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
                        onChange={(event) => setCurrentPassphrase(event.target.value)}
                        placeholder="Current passphrase"
                        type="password"
                        name="current-passphrase"
                        autoComplete="current-password"
                      />
                      <Input
                        value={newPassphrase}
                        onChange={(event) => setNewPassphrase(event.target.value)}
                        placeholder="New passphrase"
                        type="password"
                        name="new-passphrase"
                        autoComplete="new-password"
                      />
                      {newPassphrase.length > 0 && (
                        <PassphraseComplexityIndicator complexity={newPassphraseComplexity} />
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
                          {isChangingPassphrase ? 'Updating…' : 'Change passphrase'}
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
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setIsChangePassphraseMode(true)}
                    >
                      Change passphrase
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Passkey login</h3>
              {!isLinked ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Use your passkey to log in on this device.
                  </p>
                  <Button
                    type="button"
                    onClick={handleAuthenticatePasskey}
                    disabled={isAuthenticatingPasskey}
                  >
                    {isAuthenticatingPasskey ? 'Authenticating…' : 'Use passkey'}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {passkeyEnabled
                      ? 'Manage your passkey for this account.'
                      : 'Generate a passkey for quick, passwordless login.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {passkeyEnabled ? (
                      <>
                        <Button
                          type="button"
                          onClick={handleRegisterPasskey}
                          disabled={isRegisteringPasskey || !authId || !username.trim()}
                        >
                          {isRegisteringPasskey ? 'Registering…' : 'Replace passkey'}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDeletePasskey}
                          disabled={isDeletingPasskey}
                        >
                          {isDeletingPasskey ? 'Removing…' : 'Remove passkey'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleRegisterPasskey}
                        disabled={isRegisteringPasskey || !authId || !username.trim()}
                      >
                        {isRegisteringPasskey ? 'Registering…' : 'Generate passkey'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {isLinked && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Profile actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUnlink}
                  >
                    Sign out from device
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out from device or delete account</DialogTitle>
            <DialogDescription>
              Choose whether to sign out from this device or delete the account entirely.
              Group removal only affects this browser’s recent list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Associated groups</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={removeGroupsOnUnlink ? 'outline' : 'default'}
                  onClick={() => setRemoveGroupsOnUnlink(false)}
                >
                  Keep in recent list
                </Button>
                <Button
                  type="button"
                  variant={removeGroupsOnUnlink ? 'default' : 'outline'}
                  onClick={() => setRemoveGroupsOnUnlink(true)}
                >
                  Remove from recent list
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Actions</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleConfirmUnlink(removeGroupsOnUnlink)}
                >
                  Sign out from device
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteAccount(removeGroupsOnUnlink)}
                >
                  Delete account
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
