import { APP_NAME } from "@repo/shared";
import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${APP_NAME} stores about you, why, and how to delete it.`,
};

const SOURCE = "https://github.com/Tarushxo/flatch";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="15 November 2026">
      <LegalSection title="The short version">
        <p>
          {APP_NAME} is a personal portfolio project, not a business. Every flat and every lister in
          it is demo data. It stores only what it needs to work, shows no adverts, uses no tracking
          or analytics, and never sells or shares your details. You can delete everything it holds
          about you from the Profile tab at any time.
        </p>
      </LegalSection>

      <LegalSection title="What is stored">
        <ul>
          <li>
            <strong>If you continue as a guest:</strong> a guest account with a random id and a
            made-up placeholder address. It is not linked to your name, email or phone.
          </li>
          <li>
            <strong>If you continue with Google:</strong> your name, email address and profile
            picture link, as Google provides them, plus the sign-in record Google issues. The app
            asks Google for nothing else and never sees your password, contacts or files.
          </li>
          <li>
            <strong>What you tell the app:</strong> the name you choose, your age range, occupation
            and a line about yourself, and your answers about city, budget, areas, timing, room type
            and lifestyle.
          </li>
          <li>
            <strong>What you do:</strong> which flats you liked, passed or saved.
          </li>
          <li>
            <strong>A session cookie,</strong> so the app knows it is you on your next visit. It is
            used for signing in only.
          </li>
        </ul>
        <p>
          Some demo features (chats, matches and flats you post) are kept only in your own browser's
          storage for now and never reach the server.
        </p>
      </LegalSection>

      <LegalSection title="Why it is stored">
        <p>
          To show you flats that fit, to keep a flat you swiped on from coming back, and to keep
          your profile from one visit to the next. Nothing else.
        </p>
      </LegalSection>

      <LegalSection title="Where it lives">
        <ul>
          <li>The site runs on Vercel and its database is hosted by Neon, in the United States.</li>
          <li>
            Photos load from Unsplash and maps from OpenFreeMap. Like any website you visit, those
            services see your device's network address when your browser fetches from them.
          </li>
          <li>Google is involved only if you choose to sign in with Google.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Deleting your data">
        <p>
          Open the Profile tab. As a guest, <strong>Check out</strong> deletes your guest account
          with your profile and swipes. Signed in, <strong>Delete my account</strong> does the same
          for your account, and <strong>Sign out</strong> just signs this browser out. Deletion is
          immediate and cannot be undone.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          The code is public, so you can see exactly what it does. For anything else, open an issue
          on <a href={`${SOURCE}/issues`}>the project's GitHub page</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
