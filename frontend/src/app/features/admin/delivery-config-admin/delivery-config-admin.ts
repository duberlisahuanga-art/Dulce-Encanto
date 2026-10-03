import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryConfiguration, DeliveryZone } from '../../../core/delivery/delivery-config.model';
import { DeliveryConfigService } from '../../../core/delivery/delivery-config.service';
@Component({selector:'app-delivery-config-admin',imports:[FormsModule],templateUrl:'./delivery-config-admin.html',styleUrl:'./delivery-config-admin.scss'})
export class DeliveryConfigAdmin {
  private service=inject(DeliveryConfigService); protected config=signal<DeliveryConfiguration|null>(null); protected message=signal('');
  protected editingZoneId: number | undefined;
  protected zone: {name:string;fee:number;latitude:number|null;longitude:number|null;radius_km:number|null}={name:'',fee:0,latitude:null,longitude:null,radius_km:null}; protected blocked={date:'',reason:''};
  constructor(){this.load();} protected load(){this.service.admin().subscribe(({data})=>this.config.set(data));}
  protected saveSettings(){const c=this.config(); if(c)this.service.settings(c.settings).subscribe({next:()=>this.message.set('Configuración guardada.'),error:r=>this.message.set(r.error?.message ?? 'No se pudo guardar.')});}
  protected addZone(){this.service.zone({...this.zone,is_active:true},this.editingZoneId).subscribe({next:()=>{this.zone={name:'',fee:0,latitude:null,longitude:null,radius_km:null};this.editingZoneId=undefined;this.load();},error:r=>this.message.set(r.error?.message ?? 'No se pudo guardar la zona.')});}
  protected editZone(zone:DeliveryZone){this.editingZoneId=zone.id;this.zone={name:zone.name,fee:+zone.fee,latitude:zone.latitude??null,longitude:zone.longitude??null,radius_km:zone.radius_km??null};}
  protected toggleZone(zone:any){this.service.zone({...zone,is_active:!zone.is_active},zone.id).subscribe(()=>this.load());}
  protected addBlock(){this.service.block(this.blocked.date,this.blocked.reason).subscribe(()=>{this.blocked={date:'',reason:''};this.load();});}
  protected removeBlock(id:number){this.service.unblock(id).subscribe(()=>this.load());}
}
