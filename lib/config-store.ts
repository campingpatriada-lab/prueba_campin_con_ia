// Store para guardar la URL de la API de escaneo
// Persiste mientras el servidor esté activo

let apiUrl: string | null = null

export function setApiUrl(url: string) {
  apiUrl = url
}

export function getApiUrl(): string | null {
  return apiUrl
}
