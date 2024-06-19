import { useToast } from '@/components/ui/use-toast'
import { ExpenseFormValues } from '@/lib/schemas'
import { LocateFixed, MapPinOff } from 'lucide-react'
import { AsyncButton } from './async-button'
import { Map } from './map'
import { Button } from './ui/button'

type Props = {
  location: ExpenseFormValues['location']
  updateLocation: (location: ExpenseFormValues['location']) => void
}

export function ExpenseLocationInput({ location, updateLocation }: Props) {
  const { toast } = useToast()

  async function getCoordinates(): Promise<GeolocationPosition> {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject)
    })
  }

  async function setCoordinates(): Promise<undefined> {
    try {
      const { latitude, longitude } = (await getCoordinates()).coords
      updateLocation({ latitude, longitude })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error while determining location',
        description:
          'Something wrong happened when determining your current location. Please approve potential authorisation dialogues or try again later.',
        variant: 'destructive',
      })
    }
  }

  function unsetCoordinates() {
    updateLocation(null)
  }

  return (
    <>
      <Map location={location} updateLocation={updateLocation} />
      <div className="flex gap-2">
        <AsyncButton
          type="button"
          variant="secondary"
          loadingContent="Getting location…"
          action={setCoordinates}
        >
          <LocateFixed className="w-4 h-4 mr-2" />
          Locate me
        </AsyncButton>
        {location && (
          <Button
            size="default"
            variant="outline"
            type="button"
            onClick={unsetCoordinates}
          >
            <MapPinOff className="w-4 h-4 mr-2" />
            Remove location
          </Button>
        )}
      </div>
    </>
  )
}
