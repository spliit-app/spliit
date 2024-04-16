import { auth } from '@/auth'
import { SignIn } from '@/components/signin'
import { SignOut } from '@/components/signout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// FIX for https://github.com/vercel/next.js/issues/58615
// export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()
  return (
    <main>
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center gap-4 text-center">
          <h1 className="!leading-none font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl landing-header py-2">
            Lisan <strong>Deoba</strong>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            U carstvu Vile Kamenjarke, gde se hrabri momci rađaju kao legende,
            jedan izuzetan alat se povisuje iz magle, poput velikog Lisana al
            Gaiba, koji kroz život korača sa odlučnošću i hrabrošću.
          </p>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Ova epska aplikacija, nazvana "Lisan Deoba", osvaja srca mladih
            ratnika koji dele krov pod kojim odraštaju. Svojom moćnom magijom,
            omogućava im da se zajednički suoče s najvećim izazovom -
            finansijskim troškovima.{' '}
          </p>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            U dubinama šuma Kamenjarke, aplikacija plete mrežu veza među
            momcima, omogućavajući im da lako dele troškove hrane, pića, i
            avantura koje im pruža ovo mitsko okruženje. Svim čarobnim moćima
            koje poseduje, Lisan Deoba osigurava da nijedan trošak ne ostane
            neuhvaćen, niti nepravedno raspodeljen.{' '}
          </p>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Jednako kao što Lisan al Gaib hrabro korača kroz avanture, ova
            aplikacija hrabro prolazi kroz izazove troškova mladih ratnika,
            nudeći im štit u borbi protiv finansijskih nevolja. Svojom mudrošću,
            Lisan Deoba osigurava da momci iz Vile Kamenjarke nastave svoj put
            ka epskim podvizima, neopterećeni brizganjem zlatnika.{' '}
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/groups/CuCEvILvwIjfEDuooMm6j/expenses">
                Vila Deoba
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link target="_blank" href="https://vila-kirija.duckdns.org">
                Vila Kirija
              </Link>
            </Button>
            {session ? <SignOut></SignOut> : <SignIn></SignIn>}
          </div>
        </div>
      </section>
    </main>
  )
}
