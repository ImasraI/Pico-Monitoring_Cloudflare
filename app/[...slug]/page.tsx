import { notFound, redirect } from "next/navigation";
import PublicPage from "@/components/marketing/Page";
import { metadataFor, publicPaths } from "@/components/marketing/metadata";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return metadataFor(`/${slug.join("/")}`);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const pathname = `/${slug.join("/")}`;
  if (pathname === "/danto") redirect("/danto.html");
  if (!publicPaths.includes(pathname)) notFound();
  return <PublicPage pathname={pathname} />;
}
