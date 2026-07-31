export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (userPermissions.includes('*')) return true;

  return userPermissions.some(p => {
    if (p === requiredPermission) return true;
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -2);
      return requiredPermission.startsWith(prefix);
    }
    return false;
  });
}
