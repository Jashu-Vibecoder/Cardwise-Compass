import { describe, expect, it } from 'vitest';
import { readFunctionErrorMessage } from './function-errors';

describe('function invocation errors', () => {
  it('extracts the server message from a FunctionsHttpError response', async () => {
    const response = new Response(JSON.stringify({ code: 'ACCOUNT_DELETE_FAILED', message: 'The account could not be removed.' }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
    await expect(readFunctionErrorMessage({ context: response })).resolves.toBe('The account could not be removed.');
  });

  it('returns null for a non-JSON response without consuming other errors', async () => {
    const response = new Response('not json', { status: 500 });
    await expect(readFunctionErrorMessage({ context: response })).resolves.toBeNull();
  });
});
