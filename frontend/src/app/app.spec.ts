import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { NotificationService } from './core/notifications/notification.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            authenticated: signal(false),
            user: signal(null),
            loadCurrentUser: () => of(null),
          },
        },
        { provide: NotificationService, useValue: { unread: signal(0), load: () => of(null) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const brand = compiled.querySelector('.brand')?.textContent ?? '';
    expect(brand).toContain('Dulce');
    expect(brand).toContain('Encanto');
  });

  it('should close the mobile menu when clicking outside', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.menu-button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('nav')?.classList.contains('open')).toBe(true);

    document.body.click();
    fixture.detectChanges();
    expect(element.querySelector('nav')?.classList.contains('open')).toBe(false);
  });

  it('shows the orders link for a vendor', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [App],
        providers: [
          provideRouter([]),
          {
            provide: AuthService,
            useValue: {
              authenticated: signal(true),
              user: signal({
                id: 1,
                name: 'Vendedor',
                email: 'vendedor@example.test',
                roles: ['vendedor'],
                permissions: ['pedidos.ver'],
              }),
              loadCurrentUser: () => of(null),
            },
          },
          { provide: NotificationService, useValue: { unread: signal(0), load: () => of(null) } },
        ],
      })
      .compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('.quick-links a')) as HTMLAnchorElement[];
    expect(links.some((link) => link.textContent?.includes('Pedidos'))).toBe(true);
  });
});
