// src/app/services/seo.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  price?: number;
  currency?: string;
  availability?: 'in stock' | 'out of stock' | 'preorder';
  brand?: string;
  sku?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private isBrowser: boolean;

  constructor(
    private meta: Meta,
    private title: Title,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Configurar todas las meta tags para SEO
   */
  updateMetaTags(config: SEOConfig): void {
    // ✅ Title
    this.title.setTitle(config.title);

    // ✅ Meta description
    this.meta.updateTag({ name: 'description', content: config.description });

    // ✅ Keywords (opcional pero útil)
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }

    // ✅ Open Graph (Facebook, WhatsApp, LinkedIn)
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:type', content: config.type || 'website' });

    if (config.image) {
      this.meta.updateTag({ property: 'og:image', content: config.image });
      this.meta.updateTag({ property: 'og:image:width', content: '1200' });
      this.meta.updateTag({ property: 'og:image:height', content: '630' });
    }

    if (config.url) {
      this.meta.updateTag({ property: 'og:url', content: config.url });
      // ✅ Canonical URL
      this.updateCanonicalUrl(config.url);
    }

    // ✅ Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    if (config.image) {
      this.meta.updateTag({ name: 'twitter:image', content: config.image });
    }

    // ✅ Product meta tags (para Google Shopping)
    if (config.type === 'product') {
      this.meta.updateTag({ property: 'product:price:amount', content: config.price?.toString() || '' });
      this.meta.updateTag({ property: 'product:price:currency', content: config.currency || 'PEN' });

      if (config.brand) {
        this.meta.updateTag({ property: 'product:brand', content: config.brand });
      }

      if (config.availability) {
        this.meta.updateTag({ property: 'product:availability', content: config.availability });
      }
    }
  }

  /**
   * Agregar Schema.org JSON-LD para productos
   * Esto hace que Google muestre Rich Snippets (precio, rating, disponibilidad)
   */
  addProductSchema(product: {
    name: string;
    description: string;
    image: string;
    sku: string;
    brand: string;
    price: number;
    currency: string;
    availability: 'InStock' | 'OutOfStock' | 'PreOrder';
    rating?: number;
    reviewCount?: number;
    url: string;
  }): void {
    if (!this.isBrowser) return;

    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': product.name,
      'description': product.description,
      'image': product.image,
      'sku': product.sku,
      'brand': {
        '@type': 'Brand',
        'name': product.brand
      },
      'offers': {
        '@type': 'Offer',
        'url': product.url,
        'priceCurrency': product.currency,
        'price': product.price,
        'availability': `https://schema.org/${product.availability}`,
        'priceValidUntil': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 días
      }
    };

    // Si tiene rating, agregarlo
    if (product.rating && product.reviewCount) {
      (schema as any).aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': product.rating,
        'reviewCount': product.reviewCount
      };
    }

    this.injectJsonLd(schema, 'product-schema');
  }

  /**
   * Agregar Schema.org JSON-LD para breadcrumbs
   */
  addBreadcrumbSchema(breadcrumbs: { name: string; url: string }[]): void {
    if (!this.isBrowser) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.name,
        'item': item.url
      }))
    };

    this.injectJsonLd(schema, 'breadcrumb-schema');
  }

  /**
   * Inyectar JSON-LD en el <head>
   */
  private injectJsonLd(schema: any, id: string): void {
    if (!this.isBrowser) return;

    // Remover el schema anterior si existe
    const existing = this.document.getElementById(id);
    if (existing) {
      existing.remove();
    }

    // Crear nuevo script tag
    const script = this.document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);

    // Agregar al head
    this.document.head.appendChild(script);
  }

  /**
   * Actualizar canonical URL
   */
  private updateCanonicalUrl(url: string): void {
    if (!this.isBrowser) return;

    // Remover canonical anterior si existe
    const existing = this.document.querySelector('link[rel="canonical"]');
    if (existing) {
      existing.remove();
    }

    // Crear nuevo link canonical
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);

    // Agregar al head
    this.document.head.appendChild(link);
  }

  /**
   * Limpiar todas las meta tags
   */
  clearMetaTags(): void {
    // Remover schemas
    const productSchema = this.document.getElementById('product-schema');
    if (productSchema) productSchema.remove();

    const breadcrumbSchema = this.document.getElementById('breadcrumb-schema');
    if (breadcrumbSchema) breadcrumbSchema.remove();

    // Remover canonical
    const canonical = this.document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.remove();
  }
}
