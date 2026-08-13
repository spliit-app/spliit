-- Backfill "Expense"."originalAmount" into minor units.
--
-- WHAT WENT WRONG
-- ---------------
-- "Expense"."amount" has always been stored in minor units (cents) of the group
-- currency. "Expense"."originalAmount" was written by the expense form in *major*
-- units until PR #425 ("Store originalAmount in minor units to match amount"),
-- and in minor units of the row's "originalCurrency" ever since. The column
-- therefore holds a mix of both conventions, while every reader (the expense form
-- and the CSV export) interprets it as minor units -- so rows written before the
-- fix are displayed 100x too small. Balances are not affected: they are derived
-- from "Expense"."amount" only.
--
-- HOW ROWS ARE CLASSIFIED (no timestamp predicate)
-- ------------------------------------------------
-- The cutover happens when each (self-hosted) instance deploys the fix, so no
-- fixed timestamp is correct for everyone. Each row is classified by its own
-- values instead.
--
-- When an amount is entered in another currency, the form derives
--   amount(major, group currency) = originalAmount(major) * conversionRate
-- and stores it as minor units of the *group* currency. So, writing
-- `gd` = decimal digits of the group currency and `od` = decimal digits of the
-- row's original currency:
--
--   pre-fix  row:  amount ~= "originalAmount" * "conversionRate" * 10^gd
--   post-fix row:  amount ~= "originalAmount" * "conversionRate" * 10^gd / 10^od
--
-- The two candidates differ by exactly 10^od, so the candidate that "amount" is
-- nearest to identifies which convention the row was written with. Note that both
-- candidates carry the *group* currency's 10^gd factor: it does not cancel out
-- unless the group and original currencies happen to have the same number of
-- decimal digits, which is why "Group" is joined below (a group in JPY holding an
-- expense in EUR is a real case).
--
-- Only rows whose original currency has decimal digits > 0 can need fixing: for a
-- 0-decimal currency (JPY, HUF, ...) major and minor units are the same thing and
-- the two candidates above are identical. Those rows are skipped explicitly by the
-- `original_factor > 1` predicate rather than by relying on that coincidence.
--
-- WHY THE CURRENCY LIST IS HARDCODED (please do not "generalise" it)
-- -----------------------------------------------------------------
-- This is a point-in-time fixup: pre-existing rows can only hold currencies that
-- were supported at the time it runs, i.e. the 30 codes of src/lib/currency-data.json
-- listed below. Currencies added later are written in minor units by the fixed code
-- and must never be touched by this migration. An unknown, empty or NULL
-- "originalCurrency" (or group "currencyCode") falls back to 2 decimal digits,
-- which is exactly what getCurrency() in src/lib/currency.ts does for the app.
--
-- WHAT CANNOT BE RECOVERED
-- ------------------------
-- Under the old code a fractional major-unit value was squeezed into an INTEGER
-- column, so e.g. 12.34 was already stored as 12 (that data loss is the bug #425
-- fixed). Those digits are gone; this migration restores the magnitude only, so
-- such a row becomes 12.00 rather than 12.34. Values below 1 major unit collapsed
-- to 0 and are indistinguishable from "not set" -- they are left alone.
--
-- SAFE TO RE-RUN: once a row has been scaled up, "amount" is nearest to the
-- post-fix candidate, so a second execution matches nothing.

WITH currency_decimals ("code", "decimals") AS (
    VALUES
        -- decimal_digits = 0 -> factor 1 -> never needs a backfill
        ('HUF', 0), ('IDR', 0), ('ISK', 0), ('JPY', 0), ('KRW', 0),
        -- decimal_digits = 2 -> factor 100
        ('AUD', 2), ('BGN', 2), ('BRL', 2), ('CAD', 2), ('CHF', 2),
        ('CNY', 2), ('CZK', 2), ('DKK', 2), ('EUR', 2), ('GBP', 2),
        ('HKD', 2), ('ILS', 2), ('INR', 2), ('MXN', 2), ('NOK', 2),
        ('NZD', 2), ('PHP', 2), ('PLN', 2), ('RON', 2), ('SEK', 2),
        ('SGD', 2), ('THB', 2), ('TRY', 2), ('USD', 2), ('ZAR', 2)
),
candidate AS (
    SELECT
        expense."id" AS "expenseId",
        expense."amount"::numeric AS "amount",
        -- what "amount" would be if "originalAmount" is in major units (pre-fix)
        expense."originalAmount"::numeric
            * expense."conversionRate"
            * power(10::numeric, COALESCE(group_currency."decimals", 2)) AS "preFixAmount",
        -- 10^od: the correction factor, and also the ratio between the two candidates
        power(10::numeric, COALESCE(original_currency."decimals", 2)) AS "originalFactor",
        expense."originalAmount"::numeric
            * power(10::numeric, COALESCE(original_currency."decimals", 2)) AS "correctedOriginalAmount",
        -- The form only stores a conversion when the two currencies differ, so a row
        -- where they match has been through a change the stored values do not reflect.
        (expense."originalCurrency" IS NOT DISTINCT FROM "group"."currencyCode")
            AS "sameCurrency"
    FROM "Expense" expense
    JOIN "Group" "group"
        ON "group"."id" = expense."groupId"
    LEFT JOIN currency_decimals original_currency
        ON original_currency."code" = expense."originalCurrency"
    LEFT JOIN currency_decimals group_currency
        ON group_currency."code" = "group"."currencyCode"
    -- Unclassifiable rows: no original amount to scale, a value that was already
    -- truncated to 0, or no rate to relate it to "amount" with.
    WHERE expense."originalAmount" IS NOT NULL
      AND expense."originalAmount" <> 0
      AND expense."conversionRate" IS NOT NULL
      AND expense."conversionRate" <> 0
),
to_fix AS (
    SELECT "expenseId", "correctedOriginalAmount"
    FROM candidate
    -- 0-decimal original currencies: major units *are* minor units, nothing to do.
    WHERE "originalFactor" > 1
      -- A row whose original currency equals its group's currency needs no
      -- conversion, so the form never writes one: its group's currency was changed
      -- afterwards (updateGroup in src/lib/api.ts lets that happen and does not
      -- rescale existing amounts), leaving "amount", "conversionRate" and the two
      -- currency codes describing different states of the world. On spliit.app such
      -- rows are 2% of the conversion data but 86% of the rows whose "amount" cannot
      -- be explained at all, so they are not classifiable and are left alone.
      AND NOT "sameCurrency"
      -- nearest fit: closer to the pre-fix candidate than to the post-fix one
      AND abs("amount" - "preFixAmount")
          < abs("amount" - "preFixAmount" / "originalFactor")
      -- ...and not wildly off it either (e.g. an "amount" edited by hand afterwards
      -- to something the stored original amount cannot explain). Such a row cannot
      -- be classified with confidence, so leave it untouched.
      AND abs("amount") <= abs("preFixAmount") * 10
      -- never write a value the INTEGER column cannot hold
      AND "correctedOriginalAmount" BETWEEN -2147483648 AND 2147483647
)
UPDATE "Expense" expense
SET "originalAmount" = to_fix."correctedOriginalAmount"::int
FROM to_fix
WHERE expense."id" = to_fix."expenseId";
