import { Component, computed, effect, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartService } from './core/cart/cart.service';
import { AuthService } from './core/auth/auth.service';
import { NotificationService } from './core/notifications/notification.service';
import { ToastService } from './core/notifications/toast.service';
import { ShoppingAssistant } from './features/shopping-assistant/shopping-assistant';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ShoppingAssistant],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  @ViewChild('adminMenu') private adminMenu?: ElementRef<HTMLDetailsElement>;
  @ViewChild('mobileMenu') private mobileMenu?: ElementRef<HTMLElement>;
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
  );
  protected readonly assistantVisible = computed(() => {
    const path = this.currentUrl()?.split('?')[0];
    return path === '/' || path === '/catalogo' || path === '/zona-fria' || path?.startsWith('/catalogo/');
  });
  protected readonly coldZonePage = computed(() => this.currentUrl()?.split('?')[0] === '/zona-fria');
  protected readonly notifications = inject(NotificationService);
  protected readonly toasts = inject(ToastService);
  protected readonly menuOpen = signal(false);
  protected readonly search = signal('');
  protected readonly isStaff = computed(() =>
    (this.auth.user()?.roles ?? []).some((role) => role !== 'cliente'),
  );
  constructor(){ effect(() => { if(this.auth.authenticated()) this.notifications.load().subscribe(); }); }

  protected searchCatalog(): void {
    const query = this.search().trim();
    this.router.navigate(['/catalogo'], { queryParams: query ? { buscar: query } : {} });
    this.menuOpen.set(false);
  }

  protected closeMenu(adminMenu?: HTMLDetailsElement): void {
    this.menuOpen.set(false);
    adminMenu?.removeAttribute('open');
  }

  @HostListener('document:click', ['$event'])
  protected closeAdminMenuFromOutside(event: MouseEvent): void {
    const target = event.target as Node;
    const menu = this.adminMenu?.nativeElement;
    if (menu?.open && !menu.contains(target)) {
      menu.removeAttribute('open');
    }
    if (
      this.menuOpen() &&
      !this.mobileMenu?.nativeElement.contains(target) &&
      !this.menuButton?.nativeElement.contains(target)
    ) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected closeAdminMenuWithEscape(): void {
    this.adminMenu?.nativeElement.removeAttribute('open');
    this.menuOpen.set(false);
  }
}
