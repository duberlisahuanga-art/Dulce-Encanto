import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CakeOption, CakeOptionType } from '../../../core/cake-designer/cake-option.model';
import { CakeDesignerService } from '../../../core/cake-designer/cake-designer.service';

@Component({
  selector: 'app-cake-options-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './cake-options-admin.html',
  styleUrl: './cake-options-admin.scss',
})
export class CakeOptionsAdmin implements OnDestroy {
  protected readonly preview = signal<string | null>(null);
  private image?: File;
  private removeImage = false;
  private objectUrl?: string;
  ngOnDestroy(): void { if (this.objectUrl) URL.revokeObjectURL(this.objectUrl); }
  protected selectImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (! ["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) { this.error.set("Selecciona una imagen JPG, PNG o WebP de hasta 3 MB."); return; }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.image = file; this.removeImage = false; this.objectUrl = URL.createObjectURL(file); this.preview.set(this.objectUrl); this.error.set("");
    (event.target as HTMLInputElement).value = "";
  }
  protected clearImage(): void { this.image = undefined; this.removeImage = true; this.preview.set(null); }
  private readonly designerService = inject(CakeDesignerService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly options = signal<CakeOption[]>([]);
  protected readonly editingId = signal<number | undefined>(undefined);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly types: { value: CakeOptionType; label: string }[] = [
    { value: 'size', label: 'Tamaño' },
    { value: 'flavor', label: 'Sabor' },
    { value: 'filling', label: 'Relleno' },
    { value: 'covering', label: 'Cobertura' },
    { value: 'decoration', label: 'Decoración' },
    { value: 'extra', label: 'Extra' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    type: ['size' as CakeOptionType, Validators.required],
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
    description: [''],
    price_adjustment: [0, [Validators.required, Validators.min(0)]],
    servings: [0, Validators.min(0)],
    colors: [''],
    sort_order: [0, [Validators.required, Validators.min(0)]],
    is_active: [true],
  });

  constructor() {
    this.reload();
  }

  protected typeLabel(type: CakeOptionType): string {
    return this.types.find((item) => item.value === type)?.label ?? type;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.designerService
      .saveOption(
        {
          image: this.image,
          remove_image: this.removeImage,
          type: value.type,
          name: value.name,
          slug: value.slug,
          description: value.description || null,
          price_adjustment: value.price_adjustment,
          servings: value.type === 'size' ? value.servings || null : null,
          available_colors: value.colors
            .split(',')
            .map((color) => color.trim())
            .filter(Boolean),
          sort_order: value.sort_order,
          is_active: value.is_active,
        },
        this.editingId(),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Opción guardada.');
          this.reset();
          this.reload();
        },
        error: (response) => {
          this.saving.set(false);
          this.error.set(response?.error?.message ?? 'No se pudo guardar.');
        },
      });
  }

  protected edit(option: CakeOption): void {
    this.clearImage(); this.removeImage = false; this.preview.set(option.image_url ?? null);
    this.editingId.set(option.id);
    this.form.setValue({
      type: option.type,
      name: option.name,
      slug: option.slug,
      description: option.description ?? '',
      price_adjustment: Number(option.price_adjustment),
      servings: option.servings ?? 0,
      colors: option.available_colors.join(', '),
      sort_order: option.sort_order,
      is_active: option.is_active,
    });
  }

  protected remove(option: CakeOption): void {
    if (!confirm(`¿Eliminar ${option.name}?`)) return;
    this.designerService.deleteOption(option.id).subscribe({
      next: () => {
        this.message.set('Opción eliminada.');
        this.reload();
      },
      error: (response) => this.error.set(response?.error?.message ?? 'No se pudo eliminar.'),
    });
  }

  protected reset(): void {
    this.clearImage(); this.removeImage = false;
    this.editingId.set(undefined);
    this.form.reset({
      type: 'size',
      name: '',
      slug: '',
      description: '',
      price_adjustment: 0,
      servings: 0,
      colors: '',
      sort_order: 0,
      is_active: true,
    });
  }

  private reload(): void {
    this.designerService.adminOptions().subscribe(({ data }) => this.options.set(data));
  }
}
