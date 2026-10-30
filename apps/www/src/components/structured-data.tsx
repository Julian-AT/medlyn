import { appUrl, siteDescription, siteName, siteUrl } from "@/lib/seo";

type FaqEntry = { question: string; answer: string };

export function StructuredData({ questions = [] }: { questions?: readonly FaqEntry[] }) {
  const organizationId = new URL("/#organization", siteUrl).href;
  const websiteId = new URL("/#website", siteUrl).href;
  const softwareId = new URL("/#software", siteUrl).href;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        url: siteUrl.href,
        logo: new URL("/images/apple-touch-icon.png", siteUrl).href,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteName,
        url: siteUrl.href,
        description: siteDescription,
        inLanguage: "en",
        publisher: { "@id": organizationId },
        about: { "@id": softwareId },
      },
      {
        "@type": "SoftwareApplication",
        "@id": softwareId,
        name: siteName,
        url: appUrl.href,
        description: siteDescription,
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        publisher: { "@id": organizationId },
      },
      ...(questions.length
        ? [
            {
              "@type": "FAQPage",
              "@id": new URL("/#faq", siteUrl).href,
              url: new URL("/#faq", siteUrl).href,
              isPartOf: { "@id": websiteId },
              mainEntity: questions.map(({ question, answer }) => ({
                "@type": "Question",
                name: question,
                acceptedAnswer: { "@type": "Answer", text: answer },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: escape HTML delimiters before embedding JSON-LD.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
