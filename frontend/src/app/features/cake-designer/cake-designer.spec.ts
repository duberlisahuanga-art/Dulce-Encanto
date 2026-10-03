import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CakeDesignerService } from '../../core/cake-designer/cake-designer.service';
import {
  CakeOption,
  CakeOptions,
  CakeOptionType,
} from '../../core/cake-designer/cake-option.model';
import { CartService } from '../../core/cart/cart.service';
import { CakeDesigner } from './cake-designer';

function option(id: number, type: CakeOptionType, name: string): CakeOption {
  return {
    id,
    type,
    name,
    slug: name.toLowerCase(),
    description: null,
    price_adjustment: '10.00',
    servings: type === 'size' ? 10 : null,
    available_colors: type === 'covering' ? ['Blanco', 'Rosa'] : [],
    sort_order: 0,
    is_active: true,
  };
}

describe('Crea tu antojo', () => {
  const options: CakeOptions = {
    size: [option(1, 'size', 'Mediana')],
    flavor: [option(2, 'flavor', 'Chocolate')],
    filling: [option(3, 'filling', 'Fresa')],
    covering: [option(4, 'covering', 'Chantilly')],
    decoration: [option(5, 'decoration', 'Floral')],
    extra: [option(6, 'extra', 'Fresas')],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CakeDesigner],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { authenticated: signal(false), user: signal(null) } },
        { provide: CakeDesignerService, useValue: { options: () => of({ data: options }) } },
        { provide: CartService, useValue: {} },
      ],
    }).compileComponents();
  });

  it('updates the interactive preview when the shape changes', () => {
    const fixture = TestBed.createComponent(CakeDesigner);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('.step-actions button:last-child') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const buttons = [
      ...fixture.nativeElement.querySelectorAll('.shape-grid button'),
    ] as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Cuadrada'))?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cake-model')?.classList).toContain(
      'shape-cuadrada',
    );
  });

  it('does not show an image reference upload', () => {
    const fixture = TestBed.createComponent(CakeDesigner);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeNull();
  });
});
