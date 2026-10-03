import { AfterViewInit, Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-delivery-tracking-map',
  template: '<div #map class="map" aria-label="Mapa de seguimiento del repartidor"></div>',
  styles: `
    :host { display: block; }
    .map { width: 100%; height: 20rem; border-radius: .9rem; }
  `,
})
export class DeliveryTrackingMap implements AfterViewInit, OnDestroy {
  readonly courierLatitude = input.required<number>();
  readonly courierLongitude = input.required<number>();
  readonly destinationLatitude = input.required<number>();
  readonly destinationLongitude = input.required<number>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private map?: L.Map;
  private courierMarker?: L.CircleMarker;
  private destinationMarker?: L.CircleMarker;
  private route?: L.Polyline;

  constructor() {
    effect(() => {
      const points = this.points();
      if (this.map) this.render(points);
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.host().nativeElement, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);
    this.render(this.points());
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private points(): [L.LatLngTuple, L.LatLngTuple] {
    return [
      [this.courierLatitude(), this.courierLongitude()],
      [this.destinationLatitude(), this.destinationLongitude()],
    ];
  }

  private render([courier, destination]: [L.LatLngTuple, L.LatLngTuple]): void {
    if (!this.map) return;

    this.courierMarker?.remove();
    this.destinationMarker?.remove();
    this.route?.remove();
    this.courierMarker = L.circleMarker(courier, {
      radius: 10,
      color: '#71364a',
      fillColor: '#a34261',
      fillOpacity: 1,
    }).addTo(this.map).bindTooltip('Repartidor');
    this.destinationMarker = L.circleMarker(destination, {
      radius: 9,
      color: '#256047',
      fillColor: '#65aa84',
      fillOpacity: 1,
    }).addTo(this.map).bindTooltip('Tu dirección');
    this.route = L.polyline([courier, destination], {
      color: '#a34261',
      weight: 4,
      dashArray: '8 8',
    }).addTo(this.map);
    this.map.fitBounds(L.latLngBounds([courier, destination]), { padding: [36, 36], maxZoom: 16 });
  }
}
