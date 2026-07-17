// src/app/utils/mostrar-error.util.ts
import Swal from 'sweetalert2';

/**
 * Muestra los errores de validación que devuelve Laravel (422) de forma legible.
 * Si el error no trae detalle de validación, muestra un mensaje genérico.
 */
export function mostrarErrorGuardado(error: any, entidad: string): void {
  const errores = error?.error?.errors;

  if (errores && typeof errores === 'object') {
    const mensajes = Object.values(errores).flat().join('\n');
    Swal.fire({
      title: 'No se pudo guardar',
      text: mensajes,
      icon: 'error',
      confirmButtonColor: '#dc3545',
      customClass: {
        popup: 'rounded-12',
        confirmButton: 'rounded-8',
      },
    });
    return;
  }

  Swal.fire({
    title: 'Error',
    text: `No se pudo guardar ${entidad}. Inténtalo de nuevo.`,
    icon: 'error',
    confirmButtonColor: '#dc3545',
    customClass: {
      popup: 'rounded-12',
      confirmButton: 'rounded-8',
    },
  });
}
