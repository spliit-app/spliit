# Expense tags

Tags describe contexts within a group. An expense may have up to ten tags, with names up to 50 Unicode code points. Names are trimmed and compared using NFKC normalization and lowercase. There is no lifetime limit on a group's tag vocabulary. Unused tags remain reusable; rename and merge management are outside this feature. Saved tags can be deleted using the trash action in the selector. The standard confirmation dialog explains that deletion removes the tag from all expenses in the group while preserving the expenses and their amounts. Removing a chip only unassigns the tag from the current expense.

Selecting several tags matches any of them. Text search is combined with that selection using AND. Filtering runs before pagination. Tag controls are collapsed and hidden when a group has no saved tags. The spending breakdown is hidden when the selected period has no named tags.

Each expense's full amount contributes to each of its tags. These overlapping totals cannot be summed to calculate group spending. Reimbursements are excluded from spending reports. Tag assignments do not change balances or settlements.

## Export format

JSON expenses include a `tags` array of display names. CSV appends a `Tags` column containing that array encoded as JSON inside an escaped CSV cell. Untagged expenses use `[]` in both formats. Names are sorted consistently.

JSON encoding inside CSV is deliberate: names may contain commas, quotes, and other punctuation, so splitting a cell by a delimiter would be ambiguous. Spreadsheet users can read the names directly; downstream consumers should CSV-decode the cell, then JSON-decode its contents. Existing financial columns retain their meanings.

## Persistence validation

Use a disposable PostgreSQL database whose name ends in `_test`. Apply the repository migrations to it, then run:

```sh
TAG_TEST_DATABASE_URL=postgresql://user:password@localhost/spliit_tags_test npx tsx scripts/test-expense-tags.ts
```

The script creates and removes its own group fixtures. It checks concurrent equivalent tag creation, transaction rollback, clearing and preserving assignments, opt-in tag loading, and vocabularies larger than 200 tags. It does not start the web app.

Existing selections are saved by tag ID. Only explicitly new selections create tags by name. If a tag was deleted while an expense form was open, saving that form ignores the missing ID rather than recreating the tag. Failed deletion requests show a translated error notification and retain the confirmation for retry.
