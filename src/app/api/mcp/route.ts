import { isValidBearerAuthorization } from '@/lib/cron'
import { env } from '@/lib/env'
import { registerSpliitTools } from '@/mcp/tools'
import { appRouter } from '@/trpc/routers/_app'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GROUP_HEADER = 'x-spliit-group-id'

async function handler(request: Request) {
  if (!env.MCP_API_KEY) return new Response(null, { status: 404 })
  if (
    !isValidBearerAuthorization(
      request.headers.get('authorization'),
      env.MCP_API_KEY,
    )
  )
    return new Response(null, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' },
    })

  const groupId = request.headers.get(GROUP_HEADER)?.trim()
  if (!groupId || groupId.length > 64)
    return Response.json(
      { error: `Missing or invalid ${GROUP_HEADER} header` },
      { status: 400 },
    )

  const mcp = createMcpHandler(() => {
    const server = new McpServer({ name: 'spliit', version: '1.0.0' })
    registerSpliitTools(server, appRouter.createCaller({}), groupId)
    return server
  })

  return mcp.fetch(request)
}

export { handler as GET, handler as POST }
