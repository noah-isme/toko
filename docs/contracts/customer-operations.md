# Returns & Support

Customer workflows are available from the storefront and admin surfaces:

- `/returns` creates and lists customer return requests.
- `/account/support` creates support tickets, lists tickets, and sends ticket messages.
- `/account/support` also loads and renders the chronological ticket transcript from `GET /support/tickets/{ticketId}/messages`.
- `/admin/returns` reviews return requests, changes status, and initiates refunds.
- `/admin/support` reviews tickets, changes status, and sends agent messages.

The shared adapters are in `src/lib/api/services/customerOperations.ts`. All requests require authentication; tenant and role enforcement remain backend responsibilities.
