# Design: Admin User CRUD

## Technical Approach

Build a complete CRUD for managing `users` table entries under `/admin/users`, following existing valsys patterns: Server Actions for mutations, Zod v4 for validation, `useActionState` for form state, and middleware for route protection. The users table and `userRole` enum already exist in the schema — no schema changes needed.

## Architecture Decisions

| Decision | Options | Tradeoff | Decision |
|----------|---------|----------|----------|
| Password on edit | Always required vs optional | Required forces unnecessary resets; optional risks stale passwords | **Optional** — only hash if field is non-empty |
| Route protection | Middleware vs per-page check | Middleware is centralized and matches existing pattern | **Middleware** — add `/admin/:path*` to matcher + role check |
| Shared form | Single component with `mode` prop vs separate create/edit | Single component reduces duplication; `mode` prop drives validation + submit action | **Single `UserForm`** with `mode: 'create' \| 'edit'` + `initialData?` |
| Delete confirmation | Client-side confirm() vs dialog | confirm() is simplest and matches project's current UX level | **Client `confirm()`** — no dialog component needed yet |
| List pagination | Client-side vs server-side | User count will be small (<50); client-side is simpler | **No pagination** — fetch all, order by `created_at DESC` |
| Self-deletion guard | Client-only vs server-only | Client guard is UX, server guard is security | **Both** — hide button client-side, reject server-side |

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    LISTING (/admin/users)                │
│                                                          │
│  Server Page ──→ db.select(users) ──→ Table component    │
│       │                              │                   │
│       └── getSession() (role check)  └── Edit/Delete btns│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               CREATE (/admin/users/new)                  │
│                                                          │
│  Server Page ──→ UserForm(mode='create')                 │
│                       │                                  │
│  Client: useActionState ──→ createUserAction(formData)   │
│                                  │                       │
│  Server: Zod validate ──→ bcrypt hash ──→ db.insert      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 EDIT (/admin/users/[id])                 │
│                                                          │
│  Server Page ──→ db.select(id) ──→ UserForm(mode='edit') │
│                       │              │                   │
│  Client: useActionState ──→ updateUserAction(formData)   │
│                                  │                       │
│  Server: Zod validate ──→ hash if password ──→ db.update │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    DELETE (Server Action)                │
│                                                          │
│  Client: confirm() ──→ deleteUserAction(userId)          │
│                                  │                       │
│  Server: getSession().sub === userId ? REJECT : db.delete│
└─────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `middleware.ts` | Modify | Add `/admin/:path*` to matcher; redirect non-admin to `/dashboard` |
| `lib/validations/user.ts` | Create | Zod schemas: `createUserSchema`, `updateUserSchema` |
| `lib/actions/user.ts` | Create | Server Actions: `createUser`, `updateUser`, `deleteUser` |
| `lib/services/user.ts` | Create | DB queries: `getAllUsers`, `getUserById`, `getUserByUsername` (reuse), `updateUser` |
| `components/forms/user-form.tsx` | Create | Shared form component with `mode` prop, `useActionState` |
| `app/(dashboard)/admin/page.tsx` | Create | Admin landing — redirect to `/admin/users` |
| `app/(dashboard)/admin/users/page.tsx` | Create | User listing table with edit/delete buttons |
| `app/(dashboard)/admin/users/new/page.tsx` | Create | Create user page wrapping `UserForm` |
| `app/(dashboard)/admin/users/[id]/page.tsx` | Create | Edit user page wrapping `UserForm` with fetched data |
| `components/sidebar.tsx` | Modify | Add "Usuarios" link under Admin section |

## Interfaces / Contracts

### Validation schemas (`lib/validations/user.ts`)

```ts
// Create — all fields required
export const createUserSchema = z.object({
  username: z.string().min(3).max(30),
  fullName: z.string().min(3).max(80),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'operator', 'viewer']),
})

// Update — password optional, everything else required
export const updateUserSchema = createUserSchema.extend({
  password: z.string().min(6).optional().or(z.literal('')),
})
```

### Form state (`lib/actions/user.ts`)

```ts
export type UserFormState = {
  success?: boolean
  error?: string
  data?: { id: string; username: string }
}
```

### Shared form props (`components/forms/user-form.tsx`)

```ts
interface UserFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    username: string
    fullName: string
    email: string
    role: 'admin' | 'operator' | 'viewer'
  }
}
```

### Service layer (`lib/services/user.ts`)

```ts
export type UserPublic = Omit<typeof users.$inferSelect, 'passwordHash'>

export async function getAllUsers(): Promise<UserPublic[]>
export async function getUserById(id: string): Promise<UserPublic | null>
```

## Security Considerations

1. **Middleware role guard**: `/admin/:path*` requests check `x-user-role` header (set by middleware after JWT verification). Non-admin roles redirect to `/dashboard`.

2. **Self-deletion prevention**: `deleteUser` Server Action compares `getSession().sub` with the target `userId`. If equal, returns error. The delete button is also hidden client-side for the current user.

3. **Password hashing**: `@node-rs/bcrypt` `hash()` on create; on edit, only hash if password field is non-empty. Never return `passwordHash` in any query used by UI.

4. **Duplicate prevention**: Check `username` and `email` uniqueness before insert/update (matching the pattern used in `owner.ts` and `vehicle.ts`).

5. **Service layer abstraction**: All DB queries for users go through `lib/services/user.ts`, returning `UserPublic` (excludes `passwordHash`).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Zod validation schemas | Valid/invalid inputs for create and update |
| Unit | Self-deletion guard | Action rejects when userId === session.sub |
| Unit | Optional password on edit | Update without password preserves hash |
| Integration | Full create flow | Action → DB → verify row exists |
| Integration | Duplicate username/email | Action returns error on conflict |
| E2E | Admin access | Non-admin redirected from /admin/users |

## Migration / Rollout

No migration needed — `users` table and `userRole` enum already exist in schema. At least one admin user must exist in the database before this feature is usable (seed script or manual insert).

## Open Questions

- [ ] Should there be a seed script to create the first admin user if none exists?
- [ ] Should the user list include a search/filter by username or email?
