# Spliit New Features Guide

Welcome to the latest version of Spliit! This guide introduces the new features that make sharing expenses easier and more secure.

## 📱 QR Code: Share Groups Instantly

Share your group with friends using a QR code - no need to copy and paste URLs!

### How to Share with QR Code
1. Open your group
2. Click the **Share** button (with the share icon)
3. Select the **QR Code** option (square icon)
4. Your friends can scan the code with any smartphone camera

### How to Join a Group via QR Code
1. On the Groups page, click **Add by URL**
2. Select the **Scan QR** tab (camera icon)
3. Grant camera permission and point your device at the QR code
4. The group will automatically load when scanned

**Tip:** Download the QR code image for easy sharing via email, chat, or social media.

---

## 💾 Backup & Restore: Never Lose Your Data

Create backups of your expense groups and restore them anytime, anywhere.

### Create a Backup
1. Go to your group's **more options menu** (three dots)
2. Select **Create Backup** (or **Export Backup** in the menu)
3. A JSON file will download to your device
4. Save it somewhere safe - this file contains all your group data!

### Restore a Group from Backup
1. Click your **Account menu** (three dots in the top right)
2. Select **Restore from backup** (when logged in)
3. Upload the JSON backup file
4. Follow the on-screen prompts to restore or create the group
5. All expenses, participants, and settings will be restored

**Note:** Backups do not include document/image files - those need to be re-uploaded if you restore a backup.

---

## 🧮 Amount Calculator: Calculate on the Fly

No more reaching for your phone's calculator! Built-in calculator for expense amounts.

### Using the Calculator
1. When creating or editing an expense, click the **Calculator icon** next to the amount field
2. A calculator popover will appear
3. Enter your calculation: `25 + 30 * 2` 
4. Press **Enter** to calculate the result
5. Click **Apply** to insert the result into the amount field

**Keyboard Shortcuts:**
- **Enter** while calculating: Calculate and show result
- **Enter** with result displayed: Apply the amount to the expense
- **Backspace**: Delete the last character
- **C key or Delete**: Clear the entire calculation

---

## 🔐 Account Authentication: Secure & Flexible

Protect your group associations and enable group recovery across devices.

### Passphrase Authentication (Simple)
Create a simple username and passphrase to protect your account:

1. Click your **Account menu** (three vertical dots)
2. Select **Account**
3. In the "Authentication" section, enter:
   - **Username**: A unique identifier (auto-generated, but you can customize it)
   - **Passphrase**: Must contain:
     - At least 8 characters
     - Uppercase and lowercase letters
     - At least one number
     - At least one special character (!@#$%, etc.)
4. Click **Save Account**

### Passkey Authentication (Advanced)
Use biometric authentication (fingerprint, face recognition) or security keys for maximum security:

1. Click your **Account menu** 
2. Select **Account**
3. In the "Passkey" section, click **Add passkey**
4. Follow your device's authentication prompt
5. Name your passkey (e.g., "My iPhone", "MacBook Pro")
6. Click **Add passkey** to confirm

### Recovering Your Account
If you're on a new device or cleared your browser data:

1. Click your **Account menu**
2. Select **Account**
3. Enter your username
4. Choose your recovery method:
   - **Use passkey**: Authenticate with your registered passkey
   - **Use passphrase**: Enter your passphrase to recover
5. Your associated groups will be restored

---

## 🗑️ Delete Groups Permanently

When you no longer need a group, you can permanently delete it.

### Delete a Group
1. Open the group you want to remove
2. Go to **Advanced settings**
3. In the **Delete group** section, click **Delete Permanently**
4. A confirmation dialog will appear warning you about the consequences
5. Create a backup if you want to keep any data
6. Check the box to also delete uploaded images (if any)
7. Click **Delete Permanently**

**⚠️ Important:**
- **This action cannot be undone!**
- All expenses, participants, and activity history will be deleted
- Uploaded images are stored in the cloud and won't be part of the backup
- Only available if you're logged in and have an associated account

### Optional: Purge a Linked Remote Group
If the group is linked to a remote instance, you can also purge the remote group when deleting locally.

1. In the delete dialog, enable **Also purge the remote group**
2. Confirm deletion

This removes all remote expenses and participants (a single placeholder participant remains on the remote side).

---

## 🔄 Group Sync: Keep Local and Remote Aligned

If your group is linked to a remote instance, you can sync changes between them.

### Sync a Group
1. Open the group
2. Go to **Advanced settings**
3. Enable **Link to remote group** and save a linked URL
4. Click **Sync now** to review and apply changes

You can select which changes to apply and choose the direction per change (local → remote or remote → local).

---

## 🌐 Arabic Language Support

Spliit now includes an LLM-generated Arabic translation for the full app UI.

### Enable Arabic
Use your browser or app language settings to switch to Arabic. The interface will update automatically.

---

## 🔄 Group Association: Track Your Groups Across Devices

Link your expense groups to your account so you can access them on any device.

### Associate a Group with Your Account
1. Click your **Account menu**
2. Select **Account**
3. Scroll to "Associated groups" section
4. Check the groups you want to link to your account
5. Click **Save Groups**

### Access Associated Groups Elsewhere
1. Sign in on another device using your username/passphrase or passkey
2. Your associated groups will automatically appear in your recent groups list
3. No need to share URLs or QR codes!

---

## ✨ Quick Tips

- **Mobile-friendly**: All features work seamlessly on phones and tablets
- **No account required**: Create groups anonymously without an account
- **Optional login**: Link an account only when you want group recovery or backup features
- **Camera permissions**: Grant camera access to scan QR codes
- **Browser storage**: Your groups are stored locally - clear browser data to start fresh
- **Export your data**: Regular backups ensure you never lose expense history

---

## Need Help?

Having trouble with any of these features? Here are some common tips:

- **QR code won't scan?** Make sure you have good lighting and the code is in focus
- **Passkey not working?** Make sure your device supports biometric authentication
- **Backup won't restore?** Ensure the JSON file hasn't been corrupted or edited
- **Passphrase complexity warning?** Your passphrase needs uppercase, lowercase, number, and special character

Check us out on [GitHub](https://github.com/carnach/spliit) to report issues or share suggestions!
