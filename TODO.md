
- Find a way to link a PR just by adding the asana url to the description on creation
  - essentially, i want to be able to do the rich linking just by creating the PR and adding the link into the description (so I NEVER HAVE TO GO INTO ASANA!)
- Multiple action types support -- Currently `action` can be string or array, but only checks exact match. Could support wildcards or exclusions.
- Better error messages -- When rules don't match, log which conditions failed and why.
- Dry-run mode -- Add input flag to log what would be updated without actually calling Asana API.
