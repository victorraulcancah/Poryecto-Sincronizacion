// src/app/helpers/slug.helper.ts
/**
 * Helper para generar y normalizar slugs para URLs amigables con SEO
 */
export class SlugHelper {
  /**
   * Genera un slug a partir de un texto
   * Ejemplo: "Computadoras Gaming" → "computadoras-gaming"
   */
  static generateSlug(text: string): string {
    if (!text) return '';

    return text
      .toString()
      .toLowerCase()
      .trim()
      // Reemplazar caracteres especiales del español
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      // Remover caracteres especiales
      .replace(/[^a-z0-9\s-]/g, '')
      // Reemplazar espacios y múltiples guiones con un solo guion
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      // Remover guiones al inicio y final
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Normaliza un slug existente (por si viene mal formado)
   */
  static normalizeSlug(slug: string): string {
    return this.generateSlug(slug);
  }

  /**
   * Genera un slug desde el nombre de categoría o retorna el slug existente
   */
  static getSlugFromCategoria(categoria: { nombre: string; slug?: string }): string {
    // Si ya tiene slug, usarlo
    if (categoria.slug) {
      return this.normalizeSlug(categoria.slug);
    }

    // Si no, generarlo desde el nombre
    return this.generateSlug(categoria.nombre);
  }
}
