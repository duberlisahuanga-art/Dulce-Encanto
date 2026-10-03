import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  CakeOption,
  CakeOptions,
  CakeQuote,
  CakeQuotePayload,
} from '../../core/cake-designer/cake-option.model';
import { CakeDesignerService } from '../../core/cake-designer/cake-designer.service';
import { CartService } from '../../core/cart/cart.service';

type OptionField = 'size_id' | 'flavor_id' | 'filling_id' | 'covering_id' | 'decoration_id';

@Component({
  selector: 'app-cake-designer',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './cake-designer.html',
  styleUrl: './cake-designer.scss',
})
export class CakeDesigner {
  private readonly designerService = inject(CakeDesignerService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  protected readonly auth = inject(AuthService);

  protected readonly options = signal<CakeOptions | null>(null);
  protected readonly selectedExtraIds = signal<number[]>([]);
  protected readonly quote = signal<CakeQuote | null>(null);
  protected readonly currentStep = signal(0);
  protected readonly loading = signal(true);
  protected readonly calculating = signal(false);
  protected readonly error = signal('');
  protected readonly cartMessage = signal('');
  private readonly revision = signal(0);
  protected readonly minimumDate = this.localDate();
  protected readonly steps = ['Producto', 'Base', 'Sabores', 'Estilo', 'Detalles', 'Resumen'];
  protected readonly productTypes = [
    {
      id: 'cake',
      name: 'Torta personalizada',
      icon: '🎂',
      image: '/images/cake-designer/product-types/producto-torta-personalizada.webp',
      enabled: true,
    },
    {
      id: 'cupcakes',
      name: 'Cupcakes',
      icon: '🧁',
      image: '/images/cake-designer/product-types/producto-cupcakes.webp',
      enabled: false,
    },
    {
      id: 'sweet-bites',
      name: 'Bocaditos dulces',
      icon: '🍪',
      image: '/images/cake-designer/product-types/producto-bocaditos-dulces.webp',
      enabled: false,
    },
    {
      id: 'savory-bites',
      name: 'Bocaditos salados',
      icon: '🥐',
      image: '/images/cake-designer/product-types/producto-bocaditos-salados.webp',
      enabled: false,
    },
    {
      id: 'cookies',
      name: 'Galletas decoradas',
      icon: '🍩',
      image: '/images/cake-designer/product-types/producto-galletas-decoradas.webp',
      enabled: false,
    },
    {
      id: 'box',
      name: 'Box personalizado',
      icon: '🎁',
      image: '/images/cake-designer/product-types/producto-box-personalizado.webp',
      enabled: false,
    },
  ];
  protected readonly shapes = [
    { id: 'Redonda', icon: '●' },
    { id: 'Cuadrada', icon: '■' },
    { id: 'Rectangular', icon: '▬' },
    { id: 'Corazón', icon: '♥' },
  ];
  protected readonly palette = [
    'Blanco',
    'Crema',
    'Rosa',
    'Celeste',
    'Lila',
    'Verde',
    'Rojo',
    'Dorado',
  ];
  protected readonly colorHex: Record<string, string> = {
    Blanco: '#fff',
    Crema: '#f4e2bd',
    Rosa: '#ed9fb4',
    Rosado: '#ed9fb4',
    Celeste: '#91cfe0',
    Lila: '#b6a0d8',
    Verde: '#8dbb91',
    Rojo: '#c94c58',
    Dorado: '#c7a45b',
  };
  private readonly decorationImages: Record<string, string> = {
    simple: '/images/cake-designer/decorations/decoracion-simple.webp',
    floral: '/images/cake-designer/decorations/decoracion-floral.webp',
    infantil: '/images/cake-designer/decorations/decoracion-infantil.webp',
    matrimonio: '/images/cake-designer/decorations/decoracion-matrimonio.webp',
    elegante: '/images/cake-designer/decorations/decoracion-elegante.webp',
    personalizada: '/images/cake-designer/decorations/decoracion-personalizada.webp',
  };
  private readonly extraImages: Record<string, string> = {
    'topper-personalizado':
      '/images/cake-designer/decorations/extra-topper-personalizado.webp',
    velas: '/images/cake-designer/decorations/extra-velas.webp',
  };

  protected readonly form = this.formBuilder.nonNullable.group({
    size_id: [0, [Validators.required, Validators.min(1)]],
    flavor_id: [0, [Validators.required, Validators.min(1)]],
    filling_id: [0, [Validators.required, Validators.min(1)]],
    covering_id: [0, [Validators.required, Validators.min(1)]],
    decoration_id: [0, [Validators.required, Validators.min(1)]],
    shape: ['Redonda'],
    color: ['Blanco'],
    secondary_color: ['Rosa'],
    detail_color: ['Dorado'],
    theme: ['', Validators.maxLength(120)],
    dedication: ['', Validators.maxLength(120)],
    delivery_date: ['', Validators.required],
  });

  protected readonly estimatedTotal = computed(() => {
    this.revision();
    const data = this.options();
    if (!data) return 0;
    const ids = [
      this.form.controls.size_id.value,
      this.form.controls.flavor_id.value,
      this.form.controls.filling_id.value,
      this.form.controls.covering_id.value,
      this.form.controls.decoration_id.value,
      ...this.selectedExtraIds(),
    ];
    return Object.values(data)
      .flat()
      .filter((option) => ids.includes(option.id))
      .reduce((total, option) => total + Number(option.price_adjustment), 0);
  });

  protected readonly previewDecorations = computed(() => {
    this.revision();
    const decoration = this.optionsFor('decoration').find(
      (option) => option.id === this.form.controls.decoration_id.value,
    );
    const extras = this.optionsFor('extra').filter((option) =>
      this.selectedExtraIds().includes(option.id),
    );

    return [decoration, ...extras]
      .filter((option): option is CakeOption => Boolean(option))
      .map((option) => this.decorationIcon(option))
      .slice(0, 8);
  });

  constructor() {
    this.designerService.options().subscribe({
      next: ({ data }) => {
        console.log('CAKE OPTIONS:', data);

        this.options.set(data);

        this.form.patchValue({
          size_id: data.size?.[0]?.id ?? 0,
          flavor_id: data.flavor?.[0]?.id ?? 0,
          filling_id: data.filling?.[0]?.id ?? 0,
          covering_id: data.covering?.[0]?.id ?? 0,
          decoration_id: data.decoration?.[0]?.id ?? 0,
        });

        this.syncColors();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('ERROR CAKE OPTIONS:', error);
        this.error.set('No pudimos cargar las opciones para crear tu antojo.');
        this.loading.set(false);
      },
    });
  }

  protected optionsFor(type: keyof CakeOptions): CakeOption[] {
    return this.options()?.[type] ?? [];
  }
  protected selected(field: OptionField, id: number): boolean {
    return this.form.controls[field].value === id;
  }
  protected choose(field: OptionField, id: number): void {
    this.form.controls[field].setValue(id);
    if (field === 'covering_id') this.syncColors();
    this.invalidate();
  }
  protected chooseColor(field: 'color' | 'secondary_color' | 'detail_color', color: string): void {
    this.form.controls[field].setValue(color);
    this.invalidate();
  }
  protected availableColors(): string[] {
    const colors =
      this.optionsFor('covering').find((item) => item.id === this.form.controls.covering_id.value)
        ?.available_colors ?? [];
    return [...new Set([...colors, ...this.palette])];
  }
  protected toggleExtra(id: number): void {
    this.selectedExtraIds.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
    this.invalidate();
  }
  protected hasExtra(id: number): boolean {
    return this.selectedExtraIds().includes(id);
  }
  protected decorationImage(option: CakeOption): string | null {
    return this.decorationImages[option.slug] ?? null;
  }
  protected extraImage(option: CakeOption): string | null {
    return this.extraImages[option.slug] ?? null;
  }
  protected imageFailed(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.hidden = true;
    image.nextElementSibling?.classList.add('visible');
  }
  protected selectedName(type: keyof CakeOptions, field: OptionField): string {
    return (
      this.optionsFor(type).find((option) => option.id === this.form.controls[field].value)?.name ??
      'Pendiente'
    );
  }
  protected next(): void {
    if (this.currentStep() < this.steps.length - 1) this.currentStep.update((step) => step + 1);
    if (this.currentStep() === this.steps.length - 1) this.calculate();
  }
  protected previous(): void {
    if (this.currentStep() > 0) this.currentStep.update((step) => step - 1);
  }
  protected goTo(step: number): void {
    this.currentStep.set(step);
  }

  protected calculate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completa las opciones y la fecha de entrega.');
      return;
    }
    this.calculating.set(true);
    this.error.set('');
    this.designerService.quote(this.payload()).subscribe({
      next: ({ data }) => {
        this.quote.set(data);
        this.calculating.set(false);
      },
      error: (response) => {
        this.error.set(response?.error?.message ?? 'No se pudo validar el precio.');
        this.calculating.set(false);
      },
    });
  }

  protected addToCart(): void {
    if (!this.auth.authenticated()) {
      this.error.set('Inicia sesión para guardar tu diseño.');
      return;
    }
    if (!this.quote()) {
      this.calculate();
      return;
    }
    this.cartService.addCake(this.payload()).subscribe({
      next: () => this.cartMessage.set('Tu antojo fue agregado al carrito.'),
      error: (response) =>
        this.error.set(response?.error?.message ?? 'No se pudo agregar el diseño.'),
    });
  }

  protected previewShape(): string {
    return this.form.controls.shape.value
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  protected previewFlavorColor(): string {
    const slug =
      this.optionsFor('flavor').find((option) => option.id === this.form.controls.flavor_id.value)
        ?.slug ?? '';
    if (slug.includes('chocolate')) return '#6f4030';
    if (slug.includes('red') || slug.includes('velvet')) return '#9f3342';
    if (slug.includes('zanahoria') || slug.includes('naranja')) return '#d79a52';
    return '#e7c98c';
  }

  protected previewFillingColor(): string {
    const slug =
      this.optionsFor('filling').find((option) => option.id === this.form.controls.filling_id.value)
        ?.slug ?? '';
    if (slug.includes('fresa') || slug.includes('fruto')) return '#c95868';
    if (slug.includes('chocolate') || slug.includes('fudge') || slug.includes('oreo'))
      return '#55352d';
    if (slug.includes('lucuma')) return '#d4a75f';
    return '#bd7a45';
  }

  private syncColors(): void {
    const colors = this.availableColors();
    if (!colors.includes(this.form.controls.color.value))
      this.form.controls.color.setValue(colors[0] ?? 'Blanco');
  }

  private decorationIcon(option: CakeOption): string {
    const value = `${option.slug} ${option.name}`.toLocaleLowerCase('es');
    if (value.includes('flor')) return '🌸';
    if (value.includes('fresa') || value.includes('fruta')) return '🍓';
    if (value.includes('chocolate')) return '🍫';
    if (value.includes('macaron')) return '◉';
    if (value.includes('topper')) return '★';
    if (value.includes('perla')) return '●';
    return '✦';
  }
  protected invalidate(): void {
    this.revision.update((value) => value + 1);
    this.quote.set(null);
    this.cartMessage.set('');
  }
  private payload(): CakeQuotePayload {
    const value = this.form.getRawValue();
    return {
      ...value,
      product_type: 'cake',
      extra_ids: this.selectedExtraIds(),
      color: value.color || null,
      secondary_color: value.secondary_color || null,
      detail_color: value.detail_color || null,
      shape: value.shape || null,
      theme: value.theme || null,
      dedication: value.dedication || null,
    };
  }
  private localDate(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
