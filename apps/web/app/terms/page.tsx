import { APP_NAME } from "@repo/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: `The few rules for using ${APP_NAME}, a portfolio demo.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="15 November 2026">
      <LegalSection title="What this is">
        <p>
          {APP_NAME} is a personal portfolio project that shows how a flat and flatmate finder could
          work. It is a demo. The flats, prices, addresses and listers you see are made up, and the
          listers who reply to you are scripted. Nothing here is an offer of a real home.
        </p>
      </LegalSection>

      <LegalSection title="Using it">
        <ul>
          <li>Use it to look around and try it out. That is what it is for.</li>
          <li>
            Do not pay anyone anything because of something you saw here. No real flat is on offer.
          </li>
          <li>
            If you post a flat, post only a place you live in or own, and do not put anyone else's
            address, photos or personal details into the app.
          </li>
          <li>Be decent in anything you write. Do not try to break the site or misuse it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What to expect">
        <p>
          It is provided as it is, free, with no promise that it will be available, correct or kept.
          Accounts and data may be reset or removed at any time, for example to tidy the demo. Posts
          that break these rules may be taken down and their accounts closed.
        </p>
      </LegalSection>

      <LegalSection title="Your data">
        <p>
          What is stored about you, and how to delete it, is on the{" "}
          <Link href="/privacy">Privacy</Link> page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
