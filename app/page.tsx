import PublicPage from "@/components/marketing/Page";
import { metadataFor } from "@/components/marketing/metadata";

export const metadata = metadataFor("/");

export default function Home() {
  return <PublicPage pathname="/" />;
}
