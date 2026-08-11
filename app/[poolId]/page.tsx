import RedeemPageClient from '@/components/RedeemPageClient';

interface RedeemPageProps {
  params: Promise<{
    poolId: string;
  }>;
}

export default async function RedeemPage({ params }: RedeemPageProps) {
  const { poolId } = await params;

  return <RedeemPageClient poolId={poolId} />;
}
