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
    <LegalPage title="Privacy" updated="16 November 2026">
      <LegalSection title="The short version">
        <p>
          {APP_NAME} is a personal portfolio project, not a business. Most of the flats and listers
          in it are sample data, marked Demo; a flat without that mark was posted by a real person.
          It stores only what it needs to work, shows no adverts, uses no tracking or analytics, and
          never sells or shares your details. You can delete everything it holds about you from the
          Profile tab at any time.
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
            <strong>What you do:</strong> which flats you liked, passed or saved, the matches that
            come of it, and the messages you send in a chat. A like on a real person's flat is
            passed on to that person with your profile; messages are seen only by the two people in
            the chat.
          </li>
          <li>
            <strong>If you post a flat:</strong> what you enter about it, including the building and
            flat number, which are shown only to a tenant you accept. Photos you upload are shrunk
            in your browser first, and details hidden inside them, such as where they were taken,
            are removed before they are sent.
          </li>
          <li>
            <strong>If you confirm you are at the flat:</strong> your device's location at that
            moment, once, kept as the flat's private location. Tenants only ever see a rough area.
            The app never tracks your location otherwise.
          </li>
          <li>
            <strong>A session cookie,</strong> so the app knows it is you on your next visit. It is
            used for signing in only.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Why it is stored">
        <p>
          To show you flats that fit, to keep a flat you swiped on from coming back, to pass a like
          on to the flat's lister, to carry a chat between two people who matched, and to keep your
          profile from one visit to the next. Nothing else.
        </p>
      </LegalSection>

      <LegalSection title="Where it lives">
        <ul>
          <li>The site runs on Vercel and its database is hosted by Neon, both in Singapore.</li>
          <li>Photos you upload are stored by Cloudinary.</li>
          <li>
            Demo photos load from Unsplash and maps from OpenFreeMap. Like any website you visit,
            those services see your device's network address when your browser fetches from them.
          </li>
          <li>Google is involved only if you choose to sign in with Google.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Deleting your data">
        <p>
          Open the Profile tab. As a guest, <strong>Check out</strong> deletes your guest account
          with your profile, swipes, matches and messages. Signed in,{" "}
          <strong>Delete my account</strong> does the same for your account, and{" "}
          <strong>Sign out</strong> just signs this browser out. Deletion is immediate and cannot be
          undone.
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
