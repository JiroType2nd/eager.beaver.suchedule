import { MePageContent } from './MePageContent';

export default function MePage({
  searchParams = {},
}: {
  searchParams?: { setup?: string };
}) {
  const isSetup = searchParams?.setup === '1';
  return <MePageContent isSetup={!!isSetup} />;
}
