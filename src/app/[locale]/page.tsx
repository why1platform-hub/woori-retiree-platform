"use client";

import Link from "next/link";
import { Card } from "@/components/UI";
import { useLocale, useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-xl font-bold">{t("welcome")}</h1>
        <p className="mt-2 text-gray-700">{t("description")}</p>
        <div className="mt-4 flex gap-3">
          <Link
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
            href={`/${locale}/login`}
          >
            {tNav("login")}
          </Link>
          <Link
            className="rounded border px-4 py-2 hover:bg-gray-50"
            href={`/${locale}/register`}
          >
            {tNav("register")}
          </Link>
          <Link href={`/${locale}/forgot-password`} className="text-blue-600 hover:underline">
            {tAuth("forgotPassword")}
          </Link>
          <Link
            className="rounded border px-4 py-2 hover:bg-gray-50"
            href={`/${locale}/dashboard`}
          >
            {t("goToDashboard")}
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">{t("features")}</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>{t("featuresList.programs")}</li>
          <li>{t("featuresList.jobs")}</li>
          <li>{t("featuresList.learning")}</li>
          <li>{t("featuresList.consultations")}</li>
          <li>{t("featuresList.support")}</li>
        </ul>
      </Card>
    </div>
  );
}
