# Feature Specification: User Accounts, Access Control & Group Syncing for Spliit

### 1. Objective
Transform Spliit from an anonymous, browser-cached expense splitter into a tiered, hybrid platform. Introduce lightweight user accounts to enable cross-device synchronization and role-gated group creation, backed by an administrative dashboard for user and instance management. Preserve the friction-free, link-based guest experience for group participants.

---

### 2. User Roles & Permission Tiers

The system defines four distinct user states:

1. **Guest (Unauthenticated):**
   * Can view, add, and edit expenses on any group accessed via a direct link.
   * Tracks recently visited groups via local browser storage only.
   * Cannot create new groups.

2. **Sync User (`sync_users` - Default upon login):**
   * Any visitor can sign in via external OAuth to attain this tier.
   * Gets automatic cross-device group synchronization across all their logged-in browsers/devices.
   * Can view and participate in groups via direct links.
   * **Cannot create new groups** until approved/promoted by an administrator.

3. **Group Creator (`group_creators`):**
   * All privileges of a Sync User.
   * **Authorized to create new expense groups.**

4. **Administrator (`admin`):**
   * All privileges of a Group Creator.
   * Access to the Administrative Dashboard and user management tools.

---

### 3. User Permission Matrix

| Action | Guest | Sync User | Group Creator | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **View Group via Direct Link** | ✅ | ✅ | ✅ | ✅ |
| **Add / Edit Expenses & Participants** | ✅ | ✅ | ✅ | ✅ |
| **Cross-Device Group Sync** | ❌ *(Local storage)* | ✅ | ✅ | ✅ |
| **Create New Groups** | ❌ *(Prompt to login)* | ❌ *(Approval notice)* | ✅ | ✅ |
| **Access Admin Dashboard** | ❌ | ❌ | ❌ | ✅ |
| **Manage / Promote User Tiers** | ❌ | ❌ | ❌ | ✅ |

---

### 4. Core Functional Requirements

#### A. External-Only Authentication (Passwordless)
* **Goal:** Enable users to sign in without managing passwords or reset flows.
* **Mechanism:** Support third-party OAuth providers exclusively (e.g., Google, GitHub).
* **Behavior:** Any user who signs in for the first time is automatically registered and assigned the base `sync_users` tier.

#### B. Tier-Gated Group Creation Flow
* **Behavior for Guests:** Clicking "Create Group" prompts an external OAuth sign-in.
* **Behavior for `sync_users`:** If a user without creator permissions attempts to create a group, the UI displays a clear status message indicating that group creation requires administrator approval.
* **Behavior for `group_creators` & `admin`:** Group creation proceeds normally. The new group is linked to their account and added to their synced dashboard.

#### C. Frictionless Guest Participation
* **Goal:** Preserve the frictionless onboarding flow for invited participants.
* **Behavior:** Anyone with a direct group link can view balances, add expenses, and edit participation details without signing in. No login screens or paywalls should block invited participants.

#### D. Cross-Device Group Synchronization
* **Behavior:** 
  * Any group created by or accessed while logged into an account is permanently associated with that user.
  * The `/groups` dashboard renders an up-to-date, synced list of active groups across any desktop, mobile, or tablet session where the user is signed in.
  * If an unauthenticated user visits groups locally and later signs in, their locally tracked groups merge into their account.

---

### 5. Administrative Dashboard & Management

#### A. Analytics & Overview
* Accessible only to users in the `admin` tier.
* Displays high-level system metrics:
  * Total groups created.
  * Total registered users (broken down by tier).
  * Total active expenses / transactions across the platform.

#### B. User Management & Tier Controls
* **Paginated User Table:** Lists all registered users (Name, Email, Profile Picture/Provider, Date Joined, Current Tier).
* **Filtering & Search:** Ability to filter users by their tier (`admin`, `group_creators`, `sync_users`) and search by email or name.
* **Tier Management:** Admins can promote or demote any user between the three registered tiers via a simple dropdown or action toggle.

#### C. Initial Admin Bootstrap Script (CLI)
* A straightforward command-line utility or script executable on the host server.
* Takes a target user's email address as an argument and promotes that user directly to the `admin` tier.
* Allows the server owner to bootstrap the first administrator account immediately after their initial OAuth login without manual database tinkering.

---

### 6. Non-Functional Goals

* **Self-Hosting Simplicity:** Minimal operational maintenance for personal/home-server environments.
* **Easy Portability & Backups:** Trivial application state and database backup/restore workflows.
* **Non-Intrusive UX:** Existing groups, direct links, and invited guests remain fully backward-compatible without unexpected authentication walls.

### 7. Additional considerations

* Try to migrate the database to SQLite
* The docker files will probably need to change (and become simpler) now that the DB will be ported to SQLite.
* Create a redeploy.sh script that re-deploys the code to the docker container. Add this to .gitignore so it isn't published.