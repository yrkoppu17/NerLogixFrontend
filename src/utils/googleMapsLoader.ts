import { Loader } from '@googlemaps/js-api-loader'

let loaderInstance: Loader | null = null

export function getGoogleMapsLoader(apiKey: string): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'routes'],
    })
  }
  return loaderInstance
}
