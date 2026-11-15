import { conversations, type Db, interests, messages, profiles, swipes, users } from "@repo/db";
import {
  cleanProfile,
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  type TenantProfile,
} from "@repo/shared";
import { eq, sql } from "drizzle-orm";

/*
 * A person's own profile. Everything here takes the id of the person asking
 * and touches only their rows.
 */

/** The profile as the app knows it. Someone who has saved nothing yet gets the defaults. */
export async function getProfile(db: Db, userId: string): Promise<TenantProfile> {
  const [row] = await db
    .select({
      name: users.name,
      about: users.about,
      ageRange: profiles.ageRange,
      occupation: profiles.occupation,
      mode: profiles.mode,
      preferences: profiles.preferences,
      onboardedAt: profiles.onboardedAt,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId));

  if (!row) return DEFAULT_PROFILE;
  return {
    name: row.name,
    about: row.about,
    ageRange: row.ageRange ?? null,
    occupation: row.occupation ?? null,
    mode: row.mode ?? "tenant",
    // Answers saved before a question existed are filled in with that question's default.
    preferences: { ...DEFAULT_PREFERENCES, ...(row.preferences ?? {}) },
    onboardedAt: row.onboardedAt ? row.onboardedAt.toISOString() : null,
  };
}

/** Save the profile and return it as stored. */
export async function saveProfile(
  db: Db,
  userId: string,
  input: TenantProfile,
): Promise<TenantProfile> {
  const previous = await getProfile(db, userId);
  const profile = cleanProfile(input, previous);
  const onboardedAt = profile.onboardedAt ? new Date(profile.onboardedAt) : null;
  const details = {
    ageRange: profile.ageRange,
    occupation: profile.occupation,
    mode: profile.mode,
    preferences: profile.preferences,
    onboardedAt,
    updatedAt: new Date(),
  };

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ name: profile.name, about: profile.about, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await tx
      .insert(profiles)
      .values({ userId, ...details })
      .onConflictDoUpdate({ target: profiles.userId, set: details });
  });

  return { ...profile, onboardedAt: onboardedAt ? onboardedAt.toISOString() : null };
}

/**
 * A guest has signed in: move what they did as a guest to their real account.
 * Where the account already has something (an older profile, a swipe on the
 * same flat), the account's own is kept.
 */
export async function moveGuestData(db: Db, guestId: string, accountId: string): Promise<void> {
  if (guestId === accountId) return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update ${swipes} set user_id = ${accountId}
      where user_id = ${guestId}
        and listing_id not in (select listing_id from ${swipes} where user_id = ${accountId})
    `);
    // Likes, matches and what was said in them. A flat the account has already liked keeps
    // the account's own like; the guest's duplicate goes when the guest account is deleted.
    await tx.execute(sql`
      update ${interests} set tenant_id = ${accountId}
      where tenant_id = ${guestId}
        and listing_id not in (select listing_id from ${interests} where tenant_id = ${accountId})
    `);
    await tx.execute(sql`
      update ${conversations} set tenant_id = ${accountId}
      where tenant_id = ${guestId}
        and interest_id in (select id from ${interests} where tenant_id = ${accountId})
    `);
    await tx.execute(sql`
      update ${messages} set sender_id = ${accountId}
      where sender_id = ${guestId}
        and conversation_id in (select id from ${conversations} where tenant_id = ${accountId})
    `);
    await tx.execute(sql`
      update ${profiles} set user_id = ${accountId}
      where user_id = ${guestId}
        and not exists (select 1 from ${profiles} where user_id = ${accountId})
    `);
    // A name or a line about themselves typed as a guest fills a blank on the account.
    await tx.execute(sql`
      update ${users} as account
      set about = case when account.about = '' then guest.about else account.about end,
          display_name = case when account.display_name = '' then guest.display_name else account.display_name end
      from ${users} as guest
      where account.id = ${accountId} and guest.id = ${guestId}
    `);
  });
}
