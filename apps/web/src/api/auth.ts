export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
  localStorage.removeItem('companyId')
}

export function getCompanyId() {
  return localStorage.getItem('companyId') ?? ''
}

export function setCompanyId(id: string) {
  localStorage.setItem('companyId', id)
}

export function isLoggedIn() {
  return !!getToken()
}
