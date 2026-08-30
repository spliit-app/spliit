import { UserTier } from '../lib/enums'
import { prisma } from '../lib/prisma'

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()

  if (!email) {
    console.error('Error: Please provide a user email address.')
    console.error('Usage: npm run make-admin <email>')
    process.exit(1)
  }

  console.log(`Searching for user with email: ${email}...`)

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(
      `Error: No user found with email "${email}".\nPlease make sure the user has signed in at least once via OAuth before running this command.`,
    )
    process.exit(1)
  }

  if (user.tier === UserTier.ADMIN) {
    console.log(
      `User ${user.name || ''} (${user.email}) is already an Administrator.`,
    )
    process.exit(0)
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { tier: UserTier.ADMIN },
  })

  console.log(
    `✅ Successfully promoted user ${updatedUser.name || ''} (${updatedUser.email}) to Administrator tier!`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
