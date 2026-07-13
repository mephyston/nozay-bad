# Spec: Poona Import and Members Administration

## Introduction
This specification defines the administrative features for importing members from Poona exports, listing them with advanced search and filters, and viewing their detailed profile information.

## Goal
1. Import Poona CSV player extracts into the Cloudflare D1 database.
2. List members with search, filters (gender, status, type), and pagination.
3. View full profile details of a member in a dedicated interface.

---

## 1. Database Schema (Already Created)
The database schema (`membersTable`) contains:
- `licence` (Unique text)
- `lastName` (Text)
- `firstName` (Text)
- `gender` ('M' / 'F')
- `birthDate` (Text)
- `email` (Text, nullable)
- `phone` (Text, nullable)
- `status` (Text, default 'valide')
- `type` (Text)
- `importedAt` (Timestamp)

---

## 2. API Endpoints (Hono Worker)
The API service (`apps/api/src/index.ts`) will expose the following endpoints:

### POST `/members/import` (Already Implemented)
- Parses multipart form-data CSV files and upserts members.
- Returns insertion/update/error statistics.

### GET `/members`
- **Query Params**:
  - `page`: default `1`
  - `limit`: default `20`
  - `search`: search term matching firstName, lastName, or licence
  - `gender`: optional `M` or `F`
  - `type`: optional string
  - `status`: optional string
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "licence": "1234567",
        "lastName": "Dupont",
        "firstName": "Jean",
        "gender": "M",
        "birthDate": "1990-01-01",
        "email": "jean.dupont@example.com",
        "phone": "0612345678",
        "status": "valide",
        "type": "Competiteur",
        "importedAt": "2026-07-07T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

### GET `/members/:licence`
- **Params**: `licence` (member licence string)
- **Response**:
  - `200 OK` with the member object.
  - `404 Not Found` if the licence doesn't match any member.

---

## 3. Astro Pages and Routing (Admin Console)

### `apps/admin-console/src/pages/admin/members/import.astro`
- Proxy route for uploading CSV files.
- Handles GET (UI render) and POST (CSV forwarding via worker binding `locals.runtime.env.API_SERVICE`).

### `apps/admin-console/src/pages/admin/members/index.astro`
- Listing page displaying the list of players.
- Parses URL search parameters and requests paginated results from `API_SERVICE/members`.
- Passes the result to `<MembersTable client:load />`.

### `apps/admin-console/src/pages/admin/members/[licence].astro`
- Detail view page.
- Calls `API_SERVICE/members/:licence`.
- Renders `<MemberProfile client:load />` or redirects to `/admin/members` on error.

---

## 4. UI Svelte 5 Components

### `PoonaImporter.svelte`
- Interactive drag-and-drop zone.
- Visual feedback spinner and summary block of results (inserted, updated, errors count).

### `MembersTable.svelte`
- Search bar (triggers page search on enter/submit).
- Select dropdowns for filters (gender, status, type).
- Responsive grid table with user-friendly statuses.
- Pagination buttons (Previous / Next) using URL-driven search param updates.

### `MemberProfile.svelte`
- Grid design displaying card panels:
  - Header: Member Name and Licence Number.
  - Personal Information: Birth date, Gender.
  - Contact Details: Email, Phone.
  - Subscription Information: Adhesion type, Status (with color indicators).
  - Administration: Imported date.
- "Back to list" button.
