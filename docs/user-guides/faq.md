# Frequently Asked Questions (FAQ)

Common questions and answers about using Spliit.

## General Questions

### What is Spliit?

Spliit is a free, open-source web application for sharing expenses with friends and family. It helps you track who paid for what and calculates who owes whom.

### Is Spliit really free?

Yes! Spliit is completely free and open-source. No premium features, no subscriptions, no hidden costs.

### Do I need to create an account?

No, you can use Spliit anonymously without creating an account. However, creating an account allows you to:
- Access groups on multiple devices
- Recover groups if you clear browser data
- Create and restore backups

### Is my data private?

Yes! Your data is stored locally in your browser. If you create an account, data is stored securely in the database only for groups you explicitly associate with your account.

### Can I use Spliit offline?

The app requires an internet connection to sync data. However, once loaded, you can view your groups offline.

---

## Groups & Participants

### How do I create a group?

Click "Groups" → "Create a Group" → Enter a name → Add participants → Click "Create Group"

### Can I edit a group after creating it?

Yes! Click the edit icon (pencil) on the group information page to change the name or description.

### How do I add someone to an existing group?

You can't directly add participants after creation, but you can:
1. Share the group URL or QR code
2. They join and view the group
3. Add them as paid-by or split-with when adding new expenses

### Can I remove someone from a group?

You can't remove participants, but you can exclude them from future expenses. Their past expenses remain in the history.

### How many people can be in a group?

There's no hard limit, but groups work best with 2-20 people. Very large groups may become difficult to manage.

---

## Expenses

### How do I add an expense?

In your group, click "Add Expense" → Fill in description, amount, who paid, and how to split → Save

### Can I edit or delete an expense?

Yes! Click on any expense to edit or delete it. Note that this affects balance calculations.

### What currencies are supported?

Spliit supports multiple currencies. You can set the currency when creating a group or editing group settings.

### Can I add expenses in different currencies?

Yes! Each expense can have its own currency. Spliit will use exchange rates to calculate balances correctly.

### Can I upload receipts?

Yes! When adding or editing an expense, you can upload images of receipts for reference.

### What's the difference between equal and custom split?

- **Equal split**: Divides the amount evenly among selected participants
- **Custom split**: You specify exact amounts or percentages for each person

### Can some people pay different amounts?

Yes! Use the "custom split" option to specify different amounts or percentages for each person.

---

## Balances & Settlement

### How are balances calculated?

Spliit tracks what each person paid and what they owe. It then simplifies the debts to minimize the number of transactions needed.

### What does "simplified debts" mean?

Instead of everyone paying back the exact person they owe, Spliit calculates the most efficient way to settle. For example, if Alice owes Bob $10 and Bob owes Carol $10, it's simpler for Alice to pay Carol directly.

### How do I mark a debt as paid?

Create a new expense and select "Reimbursement" as the category. Enter the person who paid and the person who received the money.

### Why don't the balances match what I expected?

Double-check:
- All expenses are entered correctly
- The split method is correct (equal vs custom)
- All participants are included/excluded appropriately
- Reimbursements are recorded

---

## Sharing & Access

### How do I share a group?

Click the Share button → Copy the URL or show the QR code → Share with others

### Can anyone with the link edit my group?

Yes! Spliit groups are collaborative. Anyone with the link can view and edit expenses. Share carefully!

### Should I share my group publicly?

No! Only share with people you trust. Anyone with the link can see all expenses and make changes.

### Can I make a group read-only?

Not currently. All group members have equal access.

### What if someone maliciously edits my group?

If you have a backup, you can restore it. Consider creating regular backups for important groups.

---

## Account & Authentication

### How do I create an account?

Click the Account menu (three dots) → Account → Set up a passphrase or passkey → Save

### What's the difference between passphrase and passkey?

- **Passphrase**: Username + password-style authentication (simple, works everywhere)
- **Passkey**: Biometric authentication using fingerprint/Face ID (more secure, device-specific)

### Can I use both passphrase and passkey?

Yes! You can set up both for maximum flexibility.

### I forgot my passphrase. Can I recover it?

No, passphrases cannot be recovered. This is a security feature. If you lose your passphrase, you'll lose access to your account and associated groups.

### How do I access my groups on a new device?

1. On the new device, sign in using your username and passphrase (or passkey)
2. Your associated groups will automatically appear

### Can I delete my account?

Yes. Click Account menu → Account → Delete account. This permanently removes your account and unlinks your groups.

---

## Backup & Restore

### Why should I create backups?

Backups protect against:
- Accidentally clearing browser data
- Losing access to your device
- Group data corruption
- Malicious changes by other group members

### How do I create a backup?

Click the three-dot menu on a group card → "Create Backup" (you must be logged in)

### What's included in a backup?

Backups include:
- Group information
- All participants
- All expenses and their details
- Activity history
- Settings and preferences

**Not included:** Uploaded receipt images (stored separately in the cloud)

### How do I restore a backup?

Account menu → "Restore from backup" → Upload your JSON file → Follow prompts

### Can I restore a backup on any device?

Yes! Log in to your account, then restore the backup.

### Are backups encrypted?

Backups are JSON files stored on your device. They're not encrypted, so store them securely.

---

## Technical Questions

### Is Spliit open source?

Yes! The code is available on [GitHub](https://github.com/carnach/spliit) under an open-source license.

### Can I self-host Spliit?

Yes! You can deploy your own instance. See the repository README for deployment instructions.

### What technologies does Spliit use?

- Next.js (React framework)
- Prisma (Database ORM)
- PostgreSQL (Database)
- Tailwind CSS (Styling)

### Can I contribute to Spliit?

Yes! Contributions are welcome. Check the [Contributing Guide](../../CONTRIBUTING.md) to get started.

### Is there a mobile app?

Spliit is a Progressive Web App (PWA). You can "install" it on your phone:
- iOS: Safari → Share → Add to Home Screen
- Android: Chrome → Menu → Install App

---

## Troubleshooting

### The app won't load

- Check your internet connection
- Try refreshing the page
- Clear your browser cache
- Try a different browser

### My groups disappeared

- Check if you're in the right browser/device
- Make sure you haven't cleared browser data
- Try recovering your account if you have one
- Restore from a backup if available

### Balances seem wrong

- Verify all expenses are entered correctly
- Check if any expenses have custom splits
- Make sure all reimbursements are recorded
- Try refreshing the page

### QR code scanner won't work

- Grant camera permission in your browser
- Ensure good lighting
- Make sure the QR code is in focus
- Try using a different device

### Passkey won't work

- Make sure your device supports biometric authentication
- Check that you're using a compatible browser (Chrome, Safari, Edge)
- Ensure biometrics are set up on your device

### I can't delete a group

Group deletion is only available for logged-in users with associated groups. Sign in and associate the group first.

---

## Still Have Questions?

- Check the [New Features Guide](new-features.md) for detailed feature documentation
- Review the [Getting Started Guide](getting-started.md) for basic usage
- Open an issue on [GitHub](https://github.com/carnach/spliit/issues)
- Start a discussion in GitHub Discussions
