import { createTRPCRouter } from '@/trpc/init'
import { inviteMemberProcedure } from '@/trpc/routers/groups/members/invite.procedure'
import { listGroupMembersProcedure } from '@/trpc/routers/groups/members/list.procedure'
import { removeMemberProcedure } from '@/trpc/routers/groups/members/remove.procedure'
import { revokeInviteProcedure } from '@/trpc/routers/groups/members/revoke-invite.procedure'
import { setMemberRoleProcedure } from '@/trpc/routers/groups/members/set-role.procedure'

export const groupMembersRouter = createTRPCRouter({
  list: listGroupMembersProcedure,
  invite: inviteMemberProcedure,
  revokeInvite: revokeInviteProcedure,
  remove: removeMemberProcedure,
  setRole: setMemberRoleProcedure,
})
