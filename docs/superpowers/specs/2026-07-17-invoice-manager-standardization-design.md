# Design Specification: Invoice Manager Standardization

This document outlines the design changes required to standardize the Invoices Manager page and component, converting the creation/edit modal from a Dialog to a Sheet side drawer, aligning the season selector at the Astro level, and preventing memory leaks in tests.

## 1. Context & Objectives

- **Ergonomics**: Align with the project standard by replacing the central `<Dialog>` modal with a right-aligned sliding `<Sheet>` side drawer for complex forms.
- **Aesthetics**: Standardize typography to Outfit and align header elements (title, season selector, closed season badge) at the Astro level.
- **Robustness**: Fix potential memory leaks in the test suite by unmounting the component in `afterEach`.

## 2. Architecture & Design Changes

### 2.1 Page Layout (`invoices.astro`)

- Relocate page title (`Factures`) and description to the top left.
- Align season selector dropdown and "Saison clôturée (Lecture seule)" warning badge on the top right.
- Add a client-side `<script>` to handle the season selector change and reload the page with the appropriate `?season=<id>` search parameter.

### 2.2 Svelte Component (`InvoicesManager.svelte`)

- Remove internal season selection and double headers from the Svelte template.
- Replace `<Dialog.Root>`, `<Dialog.Content>`, `<Dialog.Header>`, and `<Dialog.Footer>` with `<Sheet.Root>`, `<Sheet.Content>`, `<Sheet.Header>`, and `<Sheet.Footer>`.
- Set the Sheet content class to `w-full sm:max-w-2xl flex flex-col h-full bg-card border-border overflow-hidden` to provide a wide, comfortable form editing layout.
- Wrap the scrollable input area and the sticky footer inside the `<form>` tag:
  ```html
  <form onsubmit={handleSubmit} class="flex flex-col flex-grow overflow-hidden">
    <div class="p-6 overflow-y-auto flex-grow space-y-6">
      <!-- Input fields, Client Info, Subject, Period, Attendees, Items list -->
    </div>
    <Sheet.Footer class="p-6 border-t border-border bg-muted/20 flex justify-between items-center gap-4 shrink-0">
      <!-- Action buttons -->
    </Sheet.Footer>
  </form>
  ```
- Remove any remaining `.font-mono` styles on pricing values, replacing them with the Outfit font.

### 2.3 Unit Tests (`InvoicesManager.test.ts`)

- Store the mounted component instance:
  ```typescript
  let component: any;
  ```
- Call `unmount(component)` in the global `afterEach` hook to ensure clean DOM states and prevent memory leaks.
- Ensure selector matching assertions operate cleanly on the Sheet content wrapper.

## 3. Review & Verification Plan

- Run ESLint check: `npx eslint .`
- Run Astro diagnostics check: `npx astro check --root apps/admin-console`
- Run Vitest suite: `npx vitest run libs/features/accounting/ui/src/InvoicesManager.test.ts`
