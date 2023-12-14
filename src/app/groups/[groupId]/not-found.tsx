'use client'
import { redirect, useParams } from 'next/navigation'

export default function NotFound() {
  const { groupId } = useParams()
  console.log('Not found!', { groupId })
  redirect(`/groups/${groupId}`)
}
