import { ExpenseFormValues } from '@/lib/schemas'
import { AsyncButton } from './async-button'
import { Button } from './ui/button'

type Props = {
  location: ExpenseFormValues['location']
  updateLocation: (
    // Calling onChange() with undefined has no effect
    // so to unset an already set location use null as parameter
    location: Exclude<ExpenseFormValues['location'], undefined>,
  ) => void
}

export function ExpenseLocationInput({ location, updateLocation }: Props) {
  async function getCoordinates(): Promise<GeolocationPosition> {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject)
    })
  }

  async function setCoordinates(): Promise<undefined> {
    const { latitude, longitude } = (await getCoordinates()).coords
    updateLocation({ latitude, longitude })
  }

  function unsetCoordinates() {
    updateLocation(null)
  }

  return (
    <>
      <p> Latitude: {location?.latitude} </p>
      <p> Longitude: {location?.longitude} </p>
      <div className="flex mt-4 gap-2">
        <AsyncButton
          type="button"
          variant="default"
          loadingContent="Getting location…"
          action={setCoordinates}
        >
          {!!location ? (
            <>Update to current location</>
          ) : (
            <>Use current location</>
          )}
        </AsyncButton>
        {!!location && (
          <Button
            size="default"
            variant="destructive"
            type="button"
            onClick={unsetCoordinates}
          >
            Remove location
          </Button>
        )}
      </div>
    </>
  )
}
