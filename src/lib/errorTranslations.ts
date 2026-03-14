/**
 * Traducciones de errores comunes de Supabase a español intuitivo.
 */
export function translateError(err: any): string {
  if (!err) return "Ocurrió un error inesperado";
  
  const message = typeof err === 'string' ? err : err.message || "";
  const status = err.status;

  // Errores de Autenticación
  if (message.includes("Invalid login credentials") || message.includes("invalid_credentials")) {
    return "Email o contraseña incorrectos. Por favor, revisa tus datos.";
  }
  
  if (message.includes("Email not confirmed")) {
    return "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.";
  }
  
  if (message.includes("User already registered") || message.includes("User already exists")) {
    return "Este correo ya está registrado. Intenta iniciar sesión.";
  }
  
  if (message.includes("Password should be at least 6 characters")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  
  if (status === 429 || message.includes("rate limit") || message.includes("too many requests")) {
    return "Demasiados intentos. Por favor, espera un momento e intenta de nuevo.";
  }

  if (message.includes("database error") || message.includes("unexpected failure")) {
    return "Hubo un problema técnico temporal. Intenta de nuevo en unos minutos.";
  }

  if (message.includes("New password should be different from the old password")) {
    return "La nueva contraseña debe ser distinta a la anterior.";
  }

  if (message.includes("Auth session missing") || message.includes("Session not found")) {
    return "Tu sesión ha expirado o el link ya no es válido. Solicita uno nuevo.";
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
  console.warn("Error no traducido:", message);
  return "No pudimos completar la acción. Revisa tus datos e intenta de nuevo.";
}
