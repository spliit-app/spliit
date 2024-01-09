'use client'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getGroup } from '@/lib/api'
import { GroupFormValues, groupFormSchema } from '@/lib/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'

export type Props = {
  group?: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  onSubmit: (groupFormValues: GroupFormValues) => Promise<void>
  protectedParticipantIds?: string[]
}

export function GroupForm({
  group,
  onSubmit,
  protectedParticipantIds = [],
}: Props) {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: group
      ? {
          name: group.name,
          currency: group.currency,
          participants: group.participants,
        }
      : {
          name: '',
          currency: '',
          participants: [{ name: 'John' }, { name: 'Jane' }, { name: 'Jack' }],
        },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'participants',
    keyName: 'key',
  })

  let activeUser = 'None'

  const updateActiveUser = () => {
    if (group?.id) {
      const participant = group.participants.find((p) => p.name === activeUser)
      if (participant?.id) {
        localStorage.setItem(`${group.id}-activeUser`, participant.id)
      } else {
        localStorage.setItem(`${group.id}-newUser`, activeUser)
      }
    } else {
      localStorage.setItem('newGroup-activeUser', activeUser)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values)
        })}
      >
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Group information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group name</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder="Summer vacations"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a name for your group.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency symbol</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder="$, €, £…"
                      max={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    We’ll use it to display amounts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>
              Enter the name for each participant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {fields.map((item, index) => (
                <li key={item.key}>
                  <FormField
                    control={form.control}
                    name={`participants.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">
                          Participant #{index + 1}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input className="text-base" {...field} />
                            {item.id &&
                            protectedParticipantIds.includes(item.id) ? (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <Button
                                    variant="ghost"
                                    className="text-destructive-"
                                    type="button"
                                    size="icon"
                                    disabled
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive opacity-50" />
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  align="end"
                                  className="text-sm"
                                >
                                  This participant is part of expenses, and can
                                  not be removed.
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <Button
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => remove(index)}
                                type="button"
                                size="icon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => {
                append({ name: 'New' })
              }}
              type="button"
            >
              Add participant
            </Button>
          </CardFooter>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Local settings</CardTitle>
            <CardDescription>
              These settings are set per-device, and are used to customize your
              experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Active user</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => {
                      activeUser = value
                    }}
                    defaultValue={
                      fields.find(
                        (f) =>
                          f.id ===
                          localStorage.getItem(`${group?.id}-activeUser`),
                      )?.name || 'None'
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {[{ name: 'None' }, ...form.watch('participants')]
                        .filter((item) => item.name.length > 0)
                        .map(({ name }) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  User used as default for paying expenses.
                </FormDescription>
              </FormItem>
            </div>
          </CardContent>
        </Card>

        <SubmitButton
          size="lg"
          loadingContent={group ? 'Saving…' : 'Creating…'}
          onClick={updateActiveUser}
        >
          <Save className="w-4 h-4 mr-2" /> {group ? <>Save</> : <> Create</>}
        </SubmitButton>
      </form>
    </Form>
  )
}
