/**
 * Traducciones de errores comunes de Supabase a español intuitivo.
 */
export function translateError(err: any): string {
  if (!err) return "Ocurrió un error inesperado";
  
  const rawMessage = typeof err === 'string' ? err : err.message || err.error_description || err.toString() || "";
  const message = rawMessage.toLowerCase();
  const status = err.status;

  // Errores de Autenticación
  if (message.includes("invalid login credentials") || message.includes("invalid_credentials")) {
    return "Email o contraseña incorrectos. Por favor, revisa tus datos.";
  }
  
  if (message.includes("email not confirmed")) {
    return "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.";
  }
  
  if (message.includes("user already registered") || message.includes("user already exists")) {
    return "Este correo ya está registrado. Intenta iniciar sesión.";
  }
  
  if (message.includes("password should be at least 6 characters")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  
  if (status === 429 || message.includes("rate limit") || message.includes("too many requests")) {
    return "Demasiados intentos. Por favor, espera un momento e intenta de nuevo.";
  }

  if (message.includes("database error") || message.includes("unexpected failure")) {
    return "Hubo un problema técnico temporal. Intenta de nuevo en unos minutos.";
  }

  if (message.includes("new password should be different from the old password")) {
    return "La nueva contraseña debe ser distinta a la anterior.";
  }

  if (message.includes("auth session missing") || message.includes("session not found")) {
    return "Tu sesión ha expirado o el link ya no es válido. Solicita uno nuevo.";
  }

  if (message.includes("lock broken") || message.includes("steal")) {
    return "Estamos sincronizando tu sesión de recuperación. Por favor, espera un segundo e intenta de nuevo.";
  }

  // Traducción genérica de mensajes comunes de Supabase si no coinciden arriba
  const translations: Record<string, string> = {
    "network error": "Error de conexión. Revisa tu internet.",
    "timeout": "La solicitud tardó demasiado. Intenta de nuevo.",
  };

  for (const [key, value] of Object.entries(translations)) {
    if (message.toLowerCase().includes(key)) return value;
  }

  // Si no conocemos el error, devolvemos un mensaje genérico pero amable en español
  // en lugar del críptico error en inglés.
  console.warn("Error no traducido:", rawMessage);
  return "No pudimos completar la acción. Revisa tus datos e intenta de nuevo.";
}
