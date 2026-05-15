# wotlwedu-ui Poll Tutorial

This tutorial walks through creating a poll with multiple ideas, starting it for
a circle of registered friends, and including a non-registered friend by email
invite.

## Prerequisites

- You have a wotlwedu account and can sign in to the main UI.
- Your registered friends already have wotlwedu accounts.
- You know the email address for at least one friend who does not have a
  wotlwedu account yet.

## 1. Sign In

1. Open the main UI.
2. Sign in at `/login`.
3. After sign-in, confirm you are on `/app/home`.

## 2. Add Registered Friends

Repeat these steps for each registered friend you want in the poll audience.

1. Open `/app/friend`, or select **Friends** from the home page.
2. In **Add friend by email**, enter the registered friend's email address.
3. Select **Send Request**.
4. Ask the friend to accept the friend request from their notification or invite
   flow.
5. Return to `/app/friend` and confirm the friend appears in **Relationships**
   with an accepted relationship status.

Do not use this step for the non-registered friend. They will be invited later
from the poll sharing step.

## 3. Create a Circle for the Friend List

1. Open `/app/circle`, or select **Circles** in the app navigation.
2. Select **New Circle**.
3. In **Name**, enter a clear audience name, such as `Friday dinner friends`.
4. Optionally enter a **Description**.
5. Optionally choose a **Category**.
6. In **Members**, check each registered friend who should receive the poll.
7. Select **Create Circle**.
8. Confirm the new circle appears in the circle list and shows the expected
   member count.

## 4. Start a New Poll

1. Open `/app/create-poll`, or select **Create** in the app navigation.
2. In the **Template** step, choose the template closest to your plan.
3. In **Poll title**, enter the poll question, such as `Where should we eat on
   Friday?`.
4. In **Short note**, add any context your friends need.
5. Choose a **Category**, or leave the template category selected.
6. Select **Next**.

## 5. Add Multiple Ideas

1. In the **Ideas** step, review the prefilled idea rows.
2. Replace each **Idea name** with an option for the poll.
3. Add an **Optional note** for any idea that needs context, such as location,
   price range, or timing.
4. Select **Add Idea** until the poll has every option you want.
5. Remove any unused idea rows with **Remove**.
6. Confirm at least two ideas have non-empty names.
7. Select **Next**.

Example ideas:

- `Pizza`
- `Sushi`
- `Tacos`
- `Burgers`

## 6. Choose the Registered Friend Audience

1. In the **Audience** step, keep **Circle** selected.
2. In **Space**, choose the space where the poll should live, or leave **All
   visible spaces** if you do not need a specific space.
3. In **Circle**, choose the circle you created for the friend list.
4. In **Expiration**, choose when voting should close.
5. Use **1 Day**, **3 Days**, or **1 Week** if one of those presets is right.
6. Select **Next**.

## 7. Include a Non-Registered Friend

1. In the **Sharing** step, turn on **Create a public share link**.
2. Keep **Let link visitors vote** turned on.
3. In **Email invites**, enter the non-registered friend's email address.
4. To invite more external friends, enter each email separated by a comma, space,
   semicolon, or new line.
5. Leave **Start internal voting after publishing** turned on so registered
   circle members receive their poll votes immediately.
6. Select **Next**.

The non-registered friend cannot be added to the circle until they have an
account. The public email invite gives them a poll link, and **Let link visitors
vote** allows them to vote without signing in.

## 8. Publish and Start the Poll

1. In the **Publish** step, review the summary:
   - **Template**
   - **Ideas**
   - **Audience**
   - **Sharing**
2. Select **Publish Poll**.
3. Wait for the success message `Poll published.`.
4. Confirm the summary shows the poll title, idea count, email invite count, and
   public link.

When the poll publishes:

- The app creates items for the ideas.
- The app creates a list for those ideas.
- The app creates the poll.
- Because **Start internal voting after publishing** was on, the app starts
  voting for the selected circle.
- Because **Create a public share link** was on, the app creates a public poll
  link.
- Because the non-registered friend's email was entered in **Email invites**, the
  app queues an email invite for that address.

## 9. Share or Review the Poll

After publishing, use any of these actions:

1. Select **View Results** to open the poll results page.
2. Select **Vote** to cast your own vote in the poll.
3. Select **Copy Share Text** to copy the poll title and public link.
4. Select **Text Link** to open your device's SMS app with the share text.

## 10. What Each Friend Receives

- Registered friends in the selected circle receive internal voting access for
  the poll.
- The non-registered friend receives an email invite with the public poll link.
- Any invited non-registered friend can open the link and vote as a guest while
  the poll is still open.
