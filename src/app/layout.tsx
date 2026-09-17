import type { Metadata } from "next";
import { corporative, stevieSans } from "@/fonts";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aide & Garde",
  description:
    "Aide & Garde — mandataire en emploi direct : garde d'enfants, auxiliaires de vie, employés de maison.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${corporative.variable} ${stevieSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
