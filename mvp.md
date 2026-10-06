> **Know what they want. Make their birthday better.**

Kashki is a social birthday wishlist platform where users create birthday wishlists, discover people, see what they want, and financially contribute to their wishes.

---

## 1. Authentication & Accounts

Users can:

- Sign up
- Sign in
- Sign out
- Verify their email
- Authenticate with Google
- Maintain a session
- Edit their profile
- Update/delete their avatar

### Profile

- First name
- Last name
- Username
- Email
- Date of birth
- Avatar
- Bio
- Hide birth year

---

## 2. User Discovery

Users can search for people by:

- Name
- Username
- Exact email

Users can open a public profile and see:

- Name
- Username
- Avatar
- Bio
- Birthday
- Public lists
- Wishes

The birth year can be hidden by the profile owner.

---

## 3. Lists

Users can:

- Create lists
- Rename lists
- Delete lists when allowed
- Change list visibility

### Visibility

- `PUBLIC`
- `PRIVATE`
- `UNLISTED`

Every user automatically receives a **Birthday List**.

| Visibility | Owner | Others          | Public Profile |
| ---------- | ----- | --------------- | -------------- |
| PUBLIC     | Yes   | Yes             | Yes            |
| UNLISTED   | Yes   | Via direct link | No             |
| PRIVATE    | Yes   | No              | No             |

---

## 4. Wishes

A wish belongs to a list.

Each wish contains:

- Title
- Description
- Links
- Target amount
- Currency
- Received amount
- Status

### Targeted Wish

Example:

> MacBook — $1,000

The wish tracks how much has been gifted toward its target.

When the total received amount reaches the target:

- The wish becomes `COMPLETED`
- Further contributions are rejected

### Targetless Wish

A wish may have no target amount or currency.

This allows wishes that don't have a fixed funding goal.

### Images

Wish images are **not part of the MVP**.

---

## 5. Wallet & Money

Every user has a balance.

Users can:

- Deposit money
- View their balance
- Give gifts
- Receive gifts
- Withdraw money

All balance changes are recorded in the ledger.

### Financial invariant

Every balance-changing operation must have corresponding ledger entries.

---

## 6. Gifts

Users can give money in two ways.

### Gift for a Wish

Example:

> $200 toward Reza's MacBook

The recipient is automatically determined from:

```text
Wish → List → List Owner
```

The client cannot choose another recipient for a wish gift.

### General Gift

A user can also send money directly to another user without a wish.

Example:

> $50 birthday gift

The recipient is explicitly selected.

### Gift Transfer

Creating a gift immediately moves the money:

```text
Giver Balance
      ↓
     Gift
      ↓
Recipient Balance
```

There is no separate Gift status.

Creating a gift means the financial transfer has already happened.

---

## 7. Gift Privacy

Gift history is immutable.

Anonymous gifts hide the giver's identity from the recipient.

Example:

> Anonymous gave you $50

The giver can see their own gifts.

The recipient can see gifts they received.

Gifts cannot be edited or deleted.

Future corrections should use reversal/refund mechanisms rather than mutating financial history.

---

## 8. Notifications

Kashki supports in-app notifications for important events.

Currently:

- Gift received
- Withdrawal status changes

Users can:

- List their notifications
- See read/unread state
- Mark notifications as read

Admins can list notifications.

A completed withdrawal does **not** generate a notification.

---

## 9. Withdrawals

Users can request a withdrawal.

When a withdrawal is created, the requested amount is reserved by removing it from the available balance.

```text
User Balance
      ↓
Withdrawal Request
      ↓
Reserved Funds
```

### Admin Actions

An admin can:

- Approve
- Reject
- Complete

### Rejected Withdrawal

If rejected:

```text
Withdrawal
      ↓
Refund
      ↓
User Balance
```

The refund is recorded in the ledger.

### Completed Withdrawal

For a completed withdrawal, the external/manual transfer has been performed and a transaction ID can be recorded.

---

## 10. Admin Financial Operations

Admins can manage:

- Withdrawals
- Deposits
- Gifts
- Lists
- Wishes
- Notifications

Financial operations use:

- Database transactions
- Row locking
- Deterministic balance-lock ordering
- Ledger records
- Immutable financial history

---

# Complete MVP User Journey

The MVP supports the following end-to-end flow:

```text
Sign up
   ↓
Birthday List automatically created
   ↓
Complete profile
   ↓
Find a friend
   ↓
Open their public profile
   ↓
See Birthday List
   ↓
See their wishes
   ↓
Deposit money
   ↓
Gift money toward a wish
   ↓
Friend receives notification
   ↓
Wish progress increases
   ↓
Wish eventually reaches its target
   ↓
Wish becomes COMPLETED
   ↓
Recipient has money in their balance
   ↓
Recipient requests withdrawal
   ↓
Admin approves
   ↓
External/manual transfer is performed
   ↓
Admin completes withdrawal
```

---

# Explicitly Outside the MVP

These should **not** be implemented before the frontend:

- Wish images
- Friends/follow system
- Birthday feed
- Likes
- Comments
- Chat
- Social activity feed
- Recommendation system
- Automated payout providers
- Advanced notification providers
- Complex analytics
- Native mobile application
- Advanced moderation system

---

# MVP Status

The backend MVP is considered feature-complete enough to begin frontend development.
