import { describe, it, expect } from 'vitest';
import { usersTable } from './schema';

describe('Drizzle Schema', () => {
  it('should define users table with proper columns', () => {
    expect(usersTable).toBeDefined();
    expect(usersTable.email).toBeDefined();
    expect(usersTable.role).toBeDefined();
  });
});
