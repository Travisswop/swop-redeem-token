import {
  actionJson,
  actionOptions,
  buildActionResponse,
  fetchPool,
  getBaseUrl,
} from '@/lib/actions';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return actionOptions();
}

export async function GET(
  request: Request,
  { params }: { params: { poolId: string } },
) {
  try {
    const data = await fetchPool(params.poolId);
    return actionJson(buildActionResponse(params.poolId, data, getBaseUrl(request)));
  } catch (error) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load this blink';

    return actionJson({ message }, status);
  }
}
