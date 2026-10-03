import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import {
  ApiCollection,
  ApiItem,
  Category,
  CategoryPayload,
  Product,
  ProductDetailResponse,
} from './catalog.model';
import { API_URL } from '../config/api-url';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  publicCategories(): Observable<ApiCollection<Category>> {
    return this.http.get<ApiCollection<Category>>(`${API_URL}/api/v1/catalog/categories`);
  }
  publicProducts(): Observable<ApiCollection<Product>> { return this.http.get<ApiCollection<Product>>(`${API_URL}/api/v1/catalog/products`); }

  publicProduct(slug: string): Observable<ProductDetailResponse> {
    return this.http.get<ProductDetailResponse>(
      `${API_URL}/api/v1/catalog/products/${encodeURIComponent(slug)}`,
    );
  }

  adminCategories(): Observable<ApiCollection<Category>> {
    return this.http.get<ApiCollection<Category>>(`${API_URL}/api/v1/admin/categories`, {
      withCredentials: true,
    });
  }

  adminProducts(): Observable<ApiCollection<Product>> {
    return this.http.get<ApiCollection<Product>>(`${API_URL}/api/v1/admin/products`, {
      withCredentials: true,
    });
  }

  saveCategory(payload: CategoryPayload, id?: number): Observable<ApiItem<Category>> {
    return id
      ? this.http.put<ApiItem<Category>>(`${API_URL}/api/v1/admin/categories/${id}`, payload)
      : this.http.post<ApiItem<Category>>(`${API_URL}/api/v1/admin/categories`, payload);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/api/v1/admin/categories/${id}`);
  }

  saveProduct(payload: FormData, id?: number): Observable<ApiItem<Product>> {
    if (id) {
      payload.set('_method', 'PUT');
    }

    const url = id ? `${API_URL}/api/v1/admin/products/${id}` : `${API_URL}/api/v1/admin/products`;
    return this.http.post<ApiItem<Product>>(url, payload);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/api/v1/admin/products/${id}`);
  }
}
