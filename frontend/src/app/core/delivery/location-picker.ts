import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, input, output, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { API_URL } from '../config/api-url';
export interface DeliveryPoint { latitude: number; longitude: number; }
@Component({
 selector: 'app-location-picker',
 template: `
 <div class="map-actions"><button type="button" (click)="locate()" [disabled]="locating()">{{ locating() ? 'Buscando ubicación…' : 'Usar mi ubicación' }}</button>
 <button type="button" (click)="selectCenter()">Seleccionar centro del mapa</button></div>
 <p>Toca el mapa o mueve el marcador hasta el lugar de entrega.</p>
 <div #mapHost class="map" aria-label="Mapa para seleccionar la dirección de entrega"></div>
 @if (point()) { <button type="button" [disabled]="lookingUp()" (click)="lookup()">{{ lookingUp() ? 'Buscando dirección…' : 'Obtener dirección del punto' }}</button> }
 <p role="status">{{ message() }}</p>
 <small>Mapa y dirección aproximada: OpenStreetMap. Confirma la dirección y añade interior o referencias.</small>`,
 styles:[`:host{display:block;margin:1rem 0}.map{height:280px;border:1px solid #ead6db;border-radius:12px;z-index:0}.map-actions{display:flex;gap:.5rem;flex-wrap:wrap}button{padding:.6rem .8rem;background:#8f3f59;color:white;border:0;border-radius:8px;cursor:pointer;margin:.3rem 0}button:disabled{opacity:.5}p,small{font-size:.85rem;color:#76505b}`]
})
export class LocationPicker implements AfterViewInit, OnDestroy {
 @ViewChild('mapHost') private host!: ElementRef<HTMLElement>;
 readonly point = input<DeliveryPoint | null>(null);
 readonly center = input<DeliveryPoint | null>(null);
 readonly maximumDistanceKm = input(15);
 readonly selected = output<DeliveryPoint>();
 readonly addressFound = output<string>();
 protected readonly locating = signal(false);
 protected readonly lookingUp = signal(false);
 protected readonly message = signal('');
 private readonly http = inject(HttpClient);
 private map?: L.Map;
 private marker?: L.Marker;
 private coverageCircle?: L.Circle;
 private storeMarker?: L.Marker;
 private destroyed = false;
 private request?: import('rxjs').Subscription;
 constructor() { effect(() => {
  const point = this.point();
  const center = this.center();
  const maximumDistanceKm = this.maximumDistanceKm();
  if (point && this.map) this.render(point); else if (!point && this.marker) { this.marker.remove(); this.marker = undefined; }
  if (this.map && center) this.renderCoverage(center, maximumDistanceKm);
 }); }
 ngAfterViewInit(): void {
  const point = this.point();
  const center = this.center() ?? {latitude:-12.0464,longitude:-77.0428};
  this.map = L.map(this.host.nativeElement).setView(point ? [point.latitude,point.longitude] : [center.latitude,center.longitude], point ? 16 : 11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(this.map);
  this.map.on('click', (event: L.LeafletMouseEvent) => this.choose(event.latlng.lat,event.latlng.lng));
  this.renderCoverage(center, this.maximumDistanceKm());
  if (point) this.render(point);
 }
 ngOnDestroy(): void { this.destroyed = true; this.request?.unsubscribe(); this.map?.remove(); }
 private render(point: DeliveryPoint): void {
  if (!this.map) return;
  const position: L.LatLngTuple = [point.latitude,point.longitude];
  if (!this.marker) {
   this.marker = L.marker(position, {draggable:true, title:'Punto de entrega', icon:L.divIcon({className:'delivery-marker',html:'📍',iconSize:[30,36],iconAnchor:[15,34]})}).addTo(this.map);
   this.marker.on('dragend', () => { const location = this.marker!.getLatLng(); this.choose(location.lat,location.lng); });
  } else this.marker.setLatLng(position);
  this.map.panTo(position);
 }
 private renderCoverage(center: DeliveryPoint, maximumDistanceKm: number): void {
  if (!this.map) return;
  const position: L.LatLngTuple = [center.latitude, center.longitude];
  this.coverageCircle?.remove();
  this.storeMarker?.remove();
  this.coverageCircle = L.circle(position, {radius: maximumDistanceKm * 1000, color:'#a34f68', fillColor:'#f8dce4', fillOpacity:.16, weight:2}).addTo(this.map);
  this.storeMarker = L.marker(position, {title:'Dulce Encanto', icon:L.divIcon({className:'delivery-marker store-marker',html:'🏪',iconSize:[30,36],iconAnchor:[15,34]})}).addTo(this.map);
 }
 private choose(latitude: number, longitude: number): void {
  this.request?.unsubscribe(); this.lookingUp.set(false);
  const point = {latitude: Math.max(-90,Math.min(90,latitude)),longitude:((longitude + 180) % 360 + 360) % 360 - 180};
  this.render(point); this.selected.emit(point); this.message.set('Punto seleccionado. Puedes obtener la dirección o escribirla manualmente.');
 }
 protected selectCenter(): void { const center = this.map?.getCenter(); if (center) this.choose(center.lat,center.lng); }
 protected locate(): void {
  if (!navigator.geolocation) { this.message.set('Este dispositivo no permite detectar la ubicación. Selecciona el punto en el mapa.'); return; }
  this.locating.set(true);
  navigator.geolocation.getCurrentPosition(position => {
   if (this.destroyed) return;
   this.locating.set(false); this.choose(position.coords.latitude,position.coords.longitude);
   this.map?.setZoom(16); this.lookupPoint({latitude:position.coords.latitude,longitude:position.coords.longitude});
  }, () => { if (!this.destroyed) {this.locating.set(false);this.message.set('No se pudo obtener la ubicación. Puedes permitir el acceso o seleccionar el punto en el mapa.');} }, {enableHighAccuracy:true,timeout:15000,maximumAge:30000});
 }
 protected lookup(): void { const point = this.point(); if (point) this.lookupPoint(point); }
 private lookupPoint(point: DeliveryPoint): void {
  this.request?.unsubscribe(); this.lookingUp.set(true);
  this.request = this.http.get<{data:{address:string}}>(`${API_URL}/api/v1/location/reverse`, {withCredentials:true,params:{latitude:point.latitude,longitude:point.longitude}}).subscribe({
   next: response => {this.lookingUp.set(false);if(response.data.address){this.addressFound.emit(response.data.address);this.message.set('Dirección aproximada encontrada. Revísala antes de confirmar.');}else this.message.set('No encontramos una dirección para este punto. Escríbela manualmente.');},
   error: response => {this.lookingUp.set(false);this.message.set(response.error?.message ?? 'No se pudo obtener la dirección. Escríbela manualmente.');}
  });
 }
}
