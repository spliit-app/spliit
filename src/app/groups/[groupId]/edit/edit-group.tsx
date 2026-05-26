'use client'

import { DeleteDataButton } from '@/components/delete-data-button'
import { DeleteGroupDialog } from '@/components/delete-group-dialog'
import { GroupForm } from '@/components/group-form'
import { GroupSyncDialog } from '@/components/group-sync-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { ASSOCIATED_GROUPS_KEY } from '@/lib/anonymous-constants'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = () => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const utils = trpc.useUtils()
  const t = useTranslations('Groups')
  const { toast } = useToast()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [associatedGroupIds, setAssociatedGroupIds] = useState<string[]>([])
  const [hasImportedData, setHasImportedData] = useState(false)
  const [importSourceUrl, setImportSourceUrl] = useState<string | null>(null)
  const [savedLinkedUrl, setSavedLinkedUrl] = useState('')
  const [linkedUrl, setLinkedUrl] = useState('')
  const [linkEnabled, setLinkEnabled] = useState(false)
  const [isSavingLink, setIsSavingLink] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const refreshAccountState = useCallback(() => {
    const linkedStatus = localStorage.getItem('anonymousLinked')
    setIsLoggedIn(linkedStatus === 'true')

    const storedAssociations = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
    setAssociatedGroupIds(
      storedAssociations ? (JSON.parse(storedAssociations) as string[]) : [],
    )
  }, [])

  useEffect(() => {
    refreshAccountState()
  }, [refreshAccountState])

  useEffect(() => {
    if (advancedOpen) refreshAccountState()
  }, [advancedOpen, refreshAccountState])

  useEffect(() => {
    const checkForImportedData = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/has-import-marker`)
        const result = (await response.json()) as {
          hasImportMarker: boolean
          sourceUrl?: string | null
        }
        const nextLinkedUrl = result.sourceUrl ?? ''
        setHasImportedData(result.hasImportMarker)
        setImportSourceUrl(result.sourceUrl ?? null)
        setSavedLinkedUrl(nextLinkedUrl)
        setLinkedUrl(nextLinkedUrl)
        setLinkEnabled(Boolean(nextLinkedUrl))
      } catch {
        setHasImportedData(false)
        setImportSourceUrl(null)
        setSavedLinkedUrl('')
        setLinkedUrl('')
        setLinkEnabled(false)
      }
    }
    checkForImportedData()
  }, [groupId])

  const handleSaveLinkedUrl = async () => {
    setIsSavingLink(true)
    try {
      const response = await fetch(`/api/groups/${groupId}/has-import-marker`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: linkEnabled ? linkedUrl.trim() || null : null,
        }),
      })

      const result = (await response.json()) as {
        sourceUrl?: string | null
        error?: string
        details?: Record<string, number>
      }

      if (!response.ok) {
        throw new Error(result.error || t('LinkedUrl.errorUpdate'))
      }

      const nextLinkedUrl = result.sourceUrl ?? ''
      setSavedLinkedUrl(nextLinkedUrl)
      setLinkedUrl(nextLinkedUrl)
      setLinkEnabled(Boolean(nextLinkedUrl))
      toast({
        description: result.sourceUrl
          ? t('LinkedUrl.toastUpdated')
          : t('LinkedUrl.toastUnlinked'),
      })
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : t('LinkedUrl.errorUpdate'),
        variant: 'destructive',
      })
    } finally {
      setIsSavingLink(false)
    }
  }

  if (isLoading) return <></>

  const canSaveLink =
    !isSavingLink &&
    (linkEnabled ? linkedUrl.trim().length > 0 : savedLinkedUrl.length > 0)
  const showAdvancedSettings = isLoggedIn
  const canDeleteGroup = isLoggedIn && associatedGroupIds.includes(groupId)

  return (
    <>
      <GroupForm
        group={data?.group}
        onSubmit={async (groupFormValues, participantId) => {
          await mutateAsync({ groupId, participantId, groupFormValues })
          await utils.groups.invalidate()
        }}
        protectedParticipantIds={data?.participantsWithExpenses}
      />

      {showAdvancedSettings && (
        <div className="mt-4">
          <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">{t('AdvancedSettings.button')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('AdvancedSettings.title')}</DialogTitle>
                <DialogDescription>
                  {t('AdvancedSettings.description')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {hasImportedData && (
                  <>
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="link-remote">
                          {t('LinkedUrl.linkOption')}
                        </Label>
                        <Checkbox
                          id="link-remote"
                          checked={linkEnabled}
                          onCheckedChange={(checked) => {
                            const nextEnabled = checked === true
                            setLinkEnabled(nextEnabled)
                            if (nextEnabled) {
                              setLinkedUrl((prev) =>
                                prev ? prev : (importSourceUrl ?? ''),
                              )
                            } else {
                              setLinkedUrl('')
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('LinkedUrl.description')}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder={t('LinkedUrl.placeholder')}
                          value={linkedUrl}
                          onChange={(event) => setLinkedUrl(event.target.value)}
                          disabled={!linkEnabled || isSavingLink}
                        />
                        <Button
                          onClick={handleSaveLinkedUrl}
                          disabled={!canSaveLink}
                        >
                          {isSavingLink
                            ? t('LinkedUrl.saving')
                            : t('LinkedUrl.save')}
                        </Button>
                      </div>
                    </div>

                    <GroupSyncDialog
                      groupId={groupId}
                      enabled={linkEnabled && savedLinkedUrl.length > 0}
                    />

                    <DeleteDataButton
                      groupId={groupId}
                      hasImportedData={hasImportedData}
                    />
                  </>
                )}

                <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
                  <p className="text-sm font-medium text-destructive">
                    {t('deleteGroup')}
                  </p>
                  {canDeleteGroup ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {t('DeleteGroupDialog.description')}
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteOpen(true)}
                      >
                        {t('DeleteGroupDialog.delete')}
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This group must be associated with your profile before you
                      can delete it permanently. Open your profile menu, select
                      this group under associated groups, and save your changes.
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <DeleteGroupDialog
        groupId={groupId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
