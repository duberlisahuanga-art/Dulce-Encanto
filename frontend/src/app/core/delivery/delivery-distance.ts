import { DeliveryPoint } from './location-picker';

export function distanceInKilometers(origin: DeliveryPoint, destination: DeliveryPoint): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (destination.latitude - origin.latitude) * radians;
  const longitudeDelta = (destination.longitude - origin.longitude) * radians;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(origin.latitude * radians) * Math.cos(destination.latitude * radians)
    * Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
}
