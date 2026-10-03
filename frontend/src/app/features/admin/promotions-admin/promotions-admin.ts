import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Promotion } from '../../../core/promotions/promotion.model';
import { PromotionService } from '../../../core/promotions/promotion.service';
import { CatalogService } from '../../../core/catalog/catalog.service';
import { Product } from '../../../core/catalog/catalog.model';

@Component({
  selector: 'app-promotions-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './promotions-admin.html',
  styleUrl: './promotions-admin.scss',
})
export class PromotionsAdmin {
  private readonly service = inject(PromotionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  protected readonly promotions = signal<Promotion[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly selectedProductIds = signal<number[]>([]);
  protected readonly bannerPreview = signal<string | null>(null);
  private bannerFile: File | null = null;
  protected readonly activeCount = computed(() => this.promotions().filter((promotion) => promotion.is_active).length);
  protected readonly editingId = signal<number | null>(null);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(1000)],
    discount_type: ['percentage' as 'percentage' | 'fixed', Validators.required],
    discount_value: [10, [Validators.required, Validators.min(0.01)]],
    starts_at: ['', Validators.required],
    ends_at: ['', Validators.required],
    is_active: [true],
    applies_to_all: [false],
    accent_color: ['#934258', Validators.pattern(/^#[A-Fa-f0-9]{6}$/)],
    cta_label: ['Ver promoción', [Validators.required, Validators.maxLength(60)]],
    coupon_code: [''], requires_coupon: [false], minimum_purchase: [0],
  });

  constructor() {
    this.load();
    this.catalog.adminProducts().subscribe({ next: ({ data }) => this.products.set(data) });
  }

  protected edit(promotion: Promotion): void {
    this.editingId.set(promotion.id);
    this.form.setValue({
      name: promotion.name,
      description: promotion.description ?? '',
      discount_type: promotion.discount_type,
      discount_value: +promotion.discount_value,
      starts_at: promotion.starts_at,
      ends_at: promotion.ends_at,
      is_active: promotion.is_active,
      applies_to_all: promotion.applies_to_all,
      accent_color: promotion.accent_color,
      cta_label: promotion.cta_label,
      coupon_code: promotion.coupon_code ?? '', requires_coupon: promotion.requires_coupon, minimum_purchase: +promotion.minimum_purchase,
    });
    this.selectedProductIds.set(promotion.products.map((product) => product.id));
    this.bannerPreview.set(promotion.banner_url);
    this.bannerFile = null;
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.form.reset({ discount_type: 'percentage', discount_value: 10, is_active: true, applies_to_all: false, accent_color: '#934258', cta_label: 'Ver promoción', coupon_code: '', requires_coupon: false, minimum_purchase: 0 });
    this.selectedProductIds.set([]);
    this.bannerPreview.set(null);
    this.bannerFile = null;
  }

  protected toggleProduct(productId: number, selected: boolean): void {
    this.selectedProductIds.update((ids) => selected ? [...new Set([...ids, productId])] : ids.filter((id) => id !== productId));
  }

  protected isSelected(productId: number): boolean { return this.selectedProductIds().includes(productId); }

  protected selectBanner(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.bannerFile = file;
    this.bannerPreview.set(file ? URL.createObjectURL(file) : null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    if (!value.applies_to_all && !this.selectedProductIds().length) {
      this.error.set('Selecciona al menos un producto o aplica la promoción a todo el catálogo.');
      this.saving.set(false);
      return;
    }
    const payload = new FormData();
    payload.append('name', value.name);
    payload.append('description', value.description || '');
    payload.append('discount_type', value.discount_type);
    payload.append('discount_value', String(value.discount_value));
    payload.append('starts_at', value.starts_at);
    payload.append('ends_at', value.ends_at);
    payload.append('is_active', value.is_active ? '1' : '0');
    payload.append('applies_to_all', value.applies_to_all ? '1' : '0');
    payload.append('accent_color', value.accent_color);
    payload.append('cta_label', value.cta_label);
    payload.append('coupon_code', value.coupon_code.trim().toUpperCase());
    payload.append('requires_coupon', value.requires_coupon ? '1' : '0');
    payload.append('minimum_purchase', String(value.minimum_purchase));
    if (!value.applies_to_all) this.selectedProductIds().forEach((id) => payload.append('product_ids[]', String(id)));
    if (this.bannerFile) payload.append('banner', this.bannerFile);
    this.service
      .save(payload, this.editingId() ?? undefined)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.cancel();
          this.load();
        },
        error: (response) => {
          this.error.set(response?.error?.message ?? 'No se pudo guardar.');
          this.saving.set(false);
        },
      });
  }

  protected remove(promotion: Promotion): void {
    if (!confirm(`¿Eliminar “${promotion.name}”?`)) return;
    this.service
      .remove(promotion.id)
      .subscribe({ next: () => this.load(), error: () => this.error.set('No se pudo eliminar.') });
  }

  private load(): void {
    this.service.admin().subscribe({
      next: ({ data }) => this.promotions.set(data),
      error: () => this.error.set('No se pudieron cargar las promociones.'),
    });
  }
}
