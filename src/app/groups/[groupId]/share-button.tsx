"use client"
import { CopyButton } from '@/components/copy-button'
import { ShareUrlButton } from '@/components/share-url-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { importKeyForGroup, exportKeyForGroup } from '@/lib/cryptography'
import { env } from '@/lib/env'
import { Group } from '@prisma/client'
import { Share } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

type Props = {
  group: Group
}

export function ShareButton({ group }: Props) {
  const [url, setUrl] = useState<string>()
  const params = useSearchParams()

  useEffect(() => {
    async function getUrl() {
      if (group) {
        if (params.get("ref") == "share" && params.get("privateKey") != null) {
          console.log(`Importing Key for group ${group.id}: ${group.name}`)
          const privateKey = params.get("privateKey")
          console.log(privateKey)
          await importKeyForGroup(group.id, privateKey!, "12345678901234567890")
        }

        const privateKey = await exportKeyForGroup(group.id, "12345678901234567890")
        setUrl(`http://localhost:3000/groups/${group.id}/expenses?ref=share&privateKey=${privateKey}`)
      }
    }
    getUrl()    
  }, [group, params])


  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon">
          <Share className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="[&_p]:text-sm flex flex-col gap-3">
        <p>
          For other participants to see the group and add expenses, share its
          URL with them.
        </p>
        <div className="flex gap-2">
          <Input className="flex-1" defaultValue={url} readOnly />
          <CopyButton text={url ? url : ""} />
          <ShareUrlButton
            text={`Join my group ${group.name} on Spliit`}
            url={url ? url : ""}
          />
        </div>
        <p>
          <strong>Warning!</strong> Every person with the group URL will be able
          to see and edit expenses. Share with caution!
        </p>
      </PopoverContent>
    </Popover>
  )
}
