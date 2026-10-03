import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Category, Product } from '../../../core/catalog/catalog.model';
import { CatalogService } from '../../../core/catalog/catalog.service';

type CatalogView = 'summary' | 'categories' | 'category-products' | 'product-editor';

@Component({
  selector: 'app-catalog-admin',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './catalog-admin.html',
  styleUrl: './catalog-admin.scss',
})
export class CatalogAdmin {
  private readonly catalogService = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly view = this.route.snapshot.data['view'] as CatalogView;
  protected readonly categories = signal<Category[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly categoryEditorOpen = signal(false);
  protected readonly editingCategoryId = signal<number | undefined>(undefined);
  protected readonly editingProductId = signal<number | undefined>(undefined);
  protected readonly query = signal('');
  protected readonly availability = signal<'all' | 'available' | 'unavailable'>('all');
  protected readonly selectedImagePreview = signal<string | null>(null);
  protected selectedImage: File | null = null;

  protected readonly selectedCategory = computed(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    return this.categories().find((category) => category.slug === slug);
  });
  protected readonly visibleProducts = computed(() => {
    const category = this.selectedCategory();
    const normalizedQuery = this.query().trim().toLocaleLowerCase('es');

    return this.products().filter((product) => {
      const matchesCategory = !category || product.category_id === category.id;
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLocaleLowerCase('es').includes(normalizedQuery) ||
        product.slug.toLocaleLowerCase('es').includes(normalizedQuery);
      const matchesAvailability =
        this.availability() === 'all' ||
        (this.availability() === 'available' && product.is_available && product.is_active) ||
        (this.availability() === 'unavailable' && (!product.is_available || !product.is_active));

      return matchesCategory && matchesQuery && matchesAvailability;
    });
  });
  protected readonly availableCount = computed(
    () => this.products().filter((product) => product.is_available && product.is_active).length,
  );
  protected readonly unavailableCount = computed(
    () => this.products().length - this.availableCount(),
  );

  protected readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
    description: [''],
    sort_order: [0, [Validators.required, Validators.min(0)]],
    is_active: [true],
  });

  protected readonly productForm = this.formBuilder.nonNullable.group({
    category_id: [0, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    is_available: [true],
    is_active: [true],
    remove_image: [false],
  });

  constructor() {
    this.reload();
  }

  protected categoryImage(category: Category): string | null {
    return (
      this.products().find(
        (product) => product.category_id === category.id && Boolean(product.image_url),
      )?.image_url ?? null
    );
  }

  protected openNewCategory(): void {
    this.resetCategory();
    this.categoryEditorOpen.set(true);
  }

  protected saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const value = this.categoryForm.getRawValue();
    this.startSaving();
    this.catalogService
      .saveCategory({ ...value, description: value.description || null }, this.editingCategoryId())
      .subscribe({
        next: () => {
          this.finishSaving('Categoría guardada correctamente.');
          this.closeCategoryEditor();
          this.reload();
        },
        error: (response) => this.failSaving(response?.error?.message),
      });
  }

  protected editCategory(category: Category): void {
    this.editingCategoryId.set(category.id);
    this.categoryEditorOpen.set(true);
    this.categoryForm.setValue({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
  }

  protected removeCategory(category: Category): void {
    if (!confirm(`¿Eliminar la categoría ${category.name}?`)) return;

    this.catalogService.deleteCategory(category.id).subscribe({
      next: () => {
        this.message.set('Categoría eliminada.');
        this.reload();
      },
      error: (response) => this.failSaving(response?.error?.message),
    });
  }

  protected saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const value = this.productForm.getRawValue();
    const payload = new FormData();
    payload.set('category_id', String(value.category_id));
    payload.set('name', value.name);
    payload.set('slug', value.slug);
    payload.set('description', value.description);
    payload.set('price', String(value.price));
    payload.set('is_available', value.is_available ? '1' : '0');
    payload.set('is_active', value.is_active ? '1' : '0');
    payload.set('remove_image', value.remove_image ? '1' : '0');
    if (this.selectedImage) payload.set('image', this.selectedImage);

    this.startSaving();
    this.catalogService.saveProduct(payload, this.editingProductId()).subscribe({
      next: ({ data }) => {
        this.finishSaving('Producto guardado correctamente.');
        void this.router.navigate(['/administracion/catalogo/categorias', data.category?.slug]);
      },
      error: (response) => this.failSaving(response?.error?.message),
    });
  }

  protected removeProduct(product: Product): void {
    if (!confirm(`¿Eliminar el producto ${product.name}?`)) return;

    this.catalogService.deleteProduct(product.id).subscribe({
      next: () => {
        this.message.set('Producto eliminado.');
        this.reload();
      },
      error: (response) => this.failSaving(response?.error?.message),
    });
  }

  protected selectImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedImage = file;
    const previousPreview = this.selectedImagePreview();
    if (previousPreview?.startsWith('blob:')) URL.revokeObjectURL(previousPreview);
    this.selectedImagePreview.set(file ? URL.createObjectURL(file) : null);
  }

  protected closeCategoryEditor(): void {
    this.resetCategory();
    this.categoryEditorOpen.set(false);
  }

  protected resetCategory(): void {
    this.editingCategoryId.set(undefined);
    this.categoryForm.reset({
      name: '',
      slug: '',
      description: '',
      sort_order: this.categories().length,
      is_active: true,
    });
  }

  private editProduct(product: Product): void {
    this.editingProductId.set(product.id);
    this.selectedImage = null;
    this.selectedImagePreview.set(product.image_url);
    this.productForm.setValue({
      category_id: product.category_id,
      name: product.name,
      slug: product.slug,
      description: product.description ?? '',
      price: Number(product.price),
      is_available: product.is_available,
      is_active: product.is_active,
      remove_image: false,
    });
  }

  private prepareProductEditor(): void {
    if (this.view !== 'product-editor') return;
    const productId = Number(this.route.snapshot.paramMap.get('id'));
    const categorySlug = this.route.snapshot.queryParamMap.get('category');
    const category = this.categories().find((item) => item.slug === categorySlug);

    if (productId) {
      const product = this.products().find((item) => item.id === productId);
      if (product) this.editProduct(product);
      else this.error.set('No encontramos el producto solicitado.');
      return;
    }

    this.productForm.controls.category_id.setValue(category?.id ?? this.categories()[0]?.id ?? 0);
  }

  private reload(): void {
    this.loading.set(true);
    let categoriesLoaded = false;
    let productsLoaded = false;
    const finish = (): void => {
      if (!categoriesLoaded || !productsLoaded) return;
      this.loading.set(false);
      this.prepareProductEditor();
    };

    this.catalogService.adminCategories().subscribe({
      next: ({ data }) => {
        this.categories.set(data);
        categoriesLoaded = true;
        finish();
      },
      error: () => this.loadFailed(),
    });
    this.catalogService.adminProducts().subscribe({
      next: ({ data }) => {
        this.products.set(data);
        productsLoaded = true;
        finish();
      },
      error: () => this.loadFailed(),
    });
  }

  private loadFailed(): void {
    this.loading.set(false);
    this.error.set('No se pudo cargar el catálogo.');
  }

  private startSaving(): void {
    this.saving.set(true);
    this.message.set('');
    this.error.set('');
  }

  private finishSaving(message: string): void {
    this.saving.set(false);
    this.message.set(message);
  }

  private failSaving(message?: string): void {
    this.saving.set(false);
    this.error.set(message ?? 'No se pudo completar la operación.');
  }
}
