/**
 * The file iOS reads to decide whether this instance vouches for the Spliit iOS
 * app, letting `/groups/<id>` links open the app instead of Safari (“Universal
 * Links”). Without it the app’s entitlement is inert and links stay in the
 * browser.
 *
 * Every instance serves it, not only spliit.app: the app follows links to
 * whichever instance it is pointed at, and iOS only hands a link over if that
 * host names the app. The IDs below belong to the official app — team
 * `VKY5EKKU47`, bundle `app.spliit.spliitmobile`.
 *
 * A Route Handler rather than a file in `public/`, because iOS silently ignores
 * the association unless it arrives as `application/json` on a plain 200, and
 * the extensionless name gives static hosts nothing to guess the type from.
 *
 * See https://github.com/spliit-app/spliit-ios/blob/main/Docs/universal-links.md
 */
const appleAppSiteAssociation = {
  applinks: {
    details: [
      {
        appIDs: ['VKY5EKKU47.app.spliit.spliitmobile'],
        components: [
          {
            '/': '/groups/*',
            comment: 'Opens a group in the iOS app',
          },
        ],
      },
    ],
  },
}

export const dynamic = 'force-static'

export async function GET() {
  return new Response(JSON.stringify(appleAppSiteAssociation), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
