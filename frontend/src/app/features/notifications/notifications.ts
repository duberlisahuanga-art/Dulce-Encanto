import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationService } from '../../core/notifications/notification.service';
@Component({selector:'app-notifications',imports:[DatePipe],templateUrl:'./notifications.html',styleUrl:'./notifications.scss'}) export class Notifications{
 protected service=inject(NotificationService);private router=inject(Router);constructor(){this.service.load().subscribe();}
 protected open(item:AppNotification){const go=()=>item.link&&this.router.navigateByUrl(item.link);item.read_at?go():this.service.read(item.id).subscribe(go);}
}
