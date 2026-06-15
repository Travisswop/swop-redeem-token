import { actionJson, actionOptions } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return actionOptions();
}

export function GET() {
  return actionJson({
    rules: [
      {
        pathPattern: '/*',
        apiPath: '/api/actions/redeem/*',
      },
      {
        pathPattern: '/api/actions/redeem/**',
        apiPath: '/api/actions/redeem/**',
      },
    ],
  });
}
