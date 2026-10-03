import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ProductQuantity } from './product-quantity';
import { CartService } from './cart.service';
import { ToastService } from '../notifications/toast.service';

describe('ProductQuantity', () => {
  function setup(initial = 0) {
    const quantity = signal(initial);
    const canAdd = signal(true);
    const addResult = new Subject<unknown>();
    const toasts = { success: vi.fn(), error: vi.fn() };
    const cart = {
      quantity: () => quantity(),
      canAdd,
      cart: () => ({
        items: quantity()
          ? [{ id: 22, product_id: 10, quantity: quantity(), total: String(quantity() * 12) }]
          : [],
      }),
      limits: () => ({ per_product: 10, per_order: 20 }),
      addProduct: vi.fn(() => addResult),
      update: vi.fn((_id: number, value: number) => {
        quantity.set(value);
        return of({});
      }),
      remove: vi.fn(() => {
        quantity.set(0);
        return of({});
      }),
    };
    TestBed.configureTestingModule({
      imports: [ProductQuantity],
      providers: [
        { provide: CartService, useValue: cart },
        { provide: ToastService, useValue: toasts },
      ],
    });
    const fixture = TestBed.createComponent(ProductQuantity);
    fixture.componentRef.setInput('productId', 10);
    fixture.componentRef.setInput('productName', 'Helado de prueba');
    fixture.componentRef.setInput('addLabel', 'Agregar al carrito');
    fixture.detectChanges();
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      cart,
      toasts,
      quantity,
      canAdd,
      addResult,
    };
  }
  it('adds from the card only once while waiting and displays the new quantity', () => {
    const { fixture, element, cart, quantity, addResult } = setup();
    const button = element.querySelector('button')!;
    expect(button.textContent).toContain('Agregar al carrito');
    button.click();
    button.click();
    fixture.detectChanges();
    expect(cart.addProduct).toHaveBeenCalledExactlyOnceWith(10);
    expect(button.disabled).toBe(true);
    quantity.set(1);
    addResult.next({});
    fixture.detectChanges();
    expect(element.querySelector('output')?.textContent).toContain('1');
    expect(element.querySelectorAll('button').length).toBe(2);
  });
  it('reduces the quantity and removes the last unit while respecting the add limit', () => {
    const { fixture, element, cart, canAdd } = setup(2);
    canAdd.set(false);
    fixture.detectChanges();
    expect(element.querySelectorAll('button')[1].disabled).toBe(true);
    element.querySelector('button')!.click();
    fixture.detectChanges();
    expect(cart.update).toHaveBeenCalledWith(22, 1);
    element.querySelector('button')!.click();
    fixture.detectChanges();
    expect(cart.remove).toHaveBeenCalledWith(22);
    expect(element.querySelector('output')).toBeNull();
  });
  it('shows the selected quantity and its actual line total without repeating success notices', () => {
    const { fixture, element, cart, toasts } = setup(2);
    fixture.componentRef.setInput('showCartDetails', true);
    fixture.detectChanges();
    expect(element.querySelector('.cart-item-state')?.textContent).toContain(
      '2 unidades en tu carrito',
    );
    expect(element.querySelector('.line-total')?.textContent).toContain('S/ 24.00');
    element.querySelectorAll('button')[0].click();
    fixture.detectChanges();
    expect(cart.update).toHaveBeenCalledWith(22, 1);
    expect(element.querySelector('.line-total')?.textContent).toContain('S/ 12.00');
    expect(toasts.success).not.toHaveBeenCalled();
  });
  it('keeps the quantity unchanged and shows server errors', () => {
    const { fixture, element, addResult } = setup();
    element.querySelector('button')!.click();
    addResult.error({ error: { message: 'Este producto ya no está disponible.' } });
    fixture.detectChanges();
    expect(element.querySelector('[role=alert]')?.textContent).toContain('ya no está disponible');
    expect(element.querySelector('button')!.disabled).toBe(false);
    expect(element.querySelector('output')).toBeNull();
  });
});
