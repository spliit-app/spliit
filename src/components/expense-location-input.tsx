import { Button } from '@/components/ui/button'
import { ExpenseFormValues } from '@/lib/schemas'
import { useState } from 'react'

type Props = {
  location: ExpenseFormValues['location']
  updateLocation: (location: ExpenseFormValues['location']) => void
}

export function ExpenseLocationInput({ location, updateLocation }: Props) {
  const [latitude, setLatitude] = useState(location?.latitude || -1)
  const [longitude, setLongitude] = useState(location?.longitude || -1)

  async function getCoordinates(): Promise<GeolocationPosition> {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject)
    })
  }

  async function setCoordinates(): Promise<undefined> {
    const { latitude, longitude } = (await getCoordinates()).coords
    setLatitude(latitude)
    setLongitude(longitude)
    updateLocation({ latitude, longitude })
  }

  return (
    <>
      <Button
        size="default"
        variant="default"
        type="button"
        onClick={setCoordinates}
      >
        Set coordinates
      </Button>
    </>
  )
}
