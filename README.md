# Gallery_Album
Gallery for school.

## Supabase table of contents

1. In `supabase.sql`, replace `REPLACE_WITH_EDITOR_EMAIL` with the email address of the account that will manage entries.
2. Run the updated SQL in the Supabase SQL Editor.
3. In Supabase Authentication, create a user with that same email and a password.
4. Open `home.html`. Visitors can read the table of contents; only the configured account can add or remove entries.

Each saved title links to a generated project section with editable title and description fields and an image gallery. The fixed Computer section has its own gallery. Image uploads and edits are temporary browser previews; they are not saved to Supabase.

The phone layout is used below 992px, and a separate Computer layout is used at 992px and above. Both layouts navigate horizontally through ToC anchor links without showing scrollbars.

The page uses the project's Supabase URL and publishable key in `script.js`. The publishable key is intended for browser use; database access is restricted by the row-level security policies in `supabase.sql`. Never put a `service_role` or secret key in browser code.
