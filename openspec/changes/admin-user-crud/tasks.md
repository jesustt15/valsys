# Tasks: Admin User CRUD

## Phase 1: Foundation — Validation & Service Layer

- [ ] 1.1 Create `lib/validations/user.ts` with `createUserSchema` (username, fullName, email, password, role) and `updateUserSchema` (password optional/empty allowed)
- [ ] 1.2 Create `lib/services/user.ts` with `getAllUsers()` (returns `UserPublic` excluding passwordHash, ordered by createdAt DESC), `getUserById(id)`, and `getUserByUsername(username)` (reuse existing from auth service or add here)

## Phase 2: Server Actions

- [ ] 2.1 Create `lib/actions/user.ts` with `createUser` Server Action: Zod validate → check duplicate username/email → bcrypt hash → db.insert → return `UserFormState`
- [ ] 2.2 Add `updateUser` Server Action to `lib/actions/user.ts`: Zod validate → check duplicate (excluding self) → hash password only if non-empty → db.update → return `UserFormState`
- [ ] 2.3 Add `deleteUser` Server Action to `lib/actions/user.ts`: getSession → reject if `session.sub === userId` → db.delete → return `UserFormState`

## Phase 3: Shared Form Component

- [ ] 3.1 Create `components/forms/user-form.tsx` with `mode: 'create' | 'edit'` and `initialData?` props, using `useActionState` wired to `createUser` or `updateUser` action based on mode; fields: username, fullName, email, password (required in create, optional in edit), role select (admin/operator/viewer)

## Phase 4: Route Pages

- [ ] 4.1 Create `app/(dashboard)/admin/page.tsx` — server page that redirects to `/admin/users`
- [ ] 4.2 Create `app/(dashboard)/admin/users/page.tsx` — server page calling `getAllUsers()`, rendering a table with columns (username, fullName, email, role, actions), Edit link and Delete button (hidden for current user)
- [ ] 4.3 Create `app/(dashboard)/admin/users/new/page.tsx` — server page rendering `<UserForm mode="create" />`
- [ ] 4.4 Create `app/(dashboard)/admin/users/[id]/page.tsx` — server page fetching user via `getUserById(params.id)`, rendering `<UserForm mode="edit" initialData={...} />`, redirect to `/admin/users` if not found

## Phase 5: Middleware & Sidebar

- [ ] 5.1 Update `middleware.ts`: add `/admin/:path*` to matcher config; after JWT verification, redirect non-admin roles from `/admin/*` to `/dashboard`
- [ ] 5.2 Update `components/sidebar.tsx`: add "Usuarios" link under the Admin section (visible only for admin role), pointing to `/admin/users`

## Phase 6: Verification

- [ ] 6.1 Verify: non-admin user redirected from `/admin/users` to `/dashboard`
- [ ] 6.2 Verify: self-deletion blocked server-side (action returns error when userId matches session)
- [ ] 6.3 Verify: duplicate username/email returns validation error on create and edit
- [ ] 6.4 Verify: edit without password field preserves existing passwordHash
