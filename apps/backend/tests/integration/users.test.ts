import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db';
import { users } from '../../src/db/schema';
import { cleanDb, createTestUser, getAllUsers } from '../utils/db';

describe('Users API', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it('creates a user', async () => {
    const user = await createTestUser({
      name: 'John',
      email: 'john@example.com',
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('John');
    expect(user.email).toBe('john@example.com');
  });

  it('retrieves all users', async () => {
    await createTestUser({ name: 'John', email: 'john@example.com' });
    await createTestUser({ name: 'Jane', email: 'jane@example.com' });

    const result = await getAllUsers();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('John');
    expect(result[1].name).toBe('Jane');
  });

  it('deletes all users', async () => {
    await createTestUser({ name: 'John', email: 'john@example.com' });

    await db.delete(users).execute();
    const result = await getAllUsers();

    expect(result).toHaveLength(0);
  });
});
