import { describe, it, expect } from 'vitest';
import { canManageTemplates } from '../rbac';

describe('canManageTemplates', () => {
  it('returns true for "admin"', () => {
    expect(canManageTemplates('admin')).toBe(true);
  });

  it('returns true for "manager"', () => {
    expect(canManageTemplates('manager')).toBe(true);
  });

  it('returns false for "member"', () => {
    expect(canManageTemplates('member')).toBe(false);
  });

  it('returns false for "" (empty string)', () => {
    expect(canManageTemplates('')).toBe(false);
  });

  it('returns false for "superadmin" (unknown role)', () => {
    expect(canManageTemplates('superadmin')).toBe(false);
  });
});
