import { addParticipant } from '@/lib/api'

export default async function handler(req, res) {
  const { method } = req

  switch (method) {
    case 'POST':
      try {
        const { groupId, participantName } = req.body
        const participant = await addParticipant(groupId, participantName)
        res.status(201).json(participant)
      } catch (error) {
        res.status(500).json({ error: 'Failed to add participant' })
      }
      break
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
