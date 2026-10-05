import Site from "./Site";
import { structuredDataFor } from "./metadata";

export default function PublicPage({ pathname }: { pathname: string }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataFor(pathname)).replace(/</g, "\\u003c") }} />
      <Site pathname={pathname} />
    </>
  );
}
