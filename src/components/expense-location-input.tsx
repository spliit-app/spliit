import { ExpenseFormValues } from '@/lib/schemas'
import { AsyncButton } from './async-button'
import { MapComponent } from './map'
import { Button } from './ui/button'

type Props = {
  location: ExpenseFormValues['location']
  updateLocation: (location: ExpenseFormValues['location']) => void
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
    updateLocation(undefined)
  }

  return (
    <>
      {location && (
        <MapComponent
          latitude={location.latitude}
          longitude={location.longitude}
        />
      )}
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
