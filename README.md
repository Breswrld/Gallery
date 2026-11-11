# Gallery_Album
Gallery for school.

## Supabase table of contents

1. In `supabase.sql`, replace `REPLACE_WITH_EDITOR_EMAIL` with the email address of the account that will manage entries.
2. Run the updated SQL in the Supabase SQL Editor.
3. In Supabase Authentication, create a user with that same email and a password.
4. Open `home.html`. Visitors can read the table of contents; only the configured account can add entries.

The page uses the project's Supabase URL and publishable key in `script.js`. The publishable key is intended for browser use; database access is restricted by the row-level security policies in `supabase.sql`. Never put a `service_role` or secret key in browser code.
