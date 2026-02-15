import { Env } from './env'; // Fixed: Added missing import

export const json = (data: any, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const authorize = (request: Request, env: Env, type: 'admin' | 'ops') => {
	const authHeader = request.headers.get('Authorization');
	const expectedToken = type === 'admin' ? env.RESET_TOKEN : env.OPS_TOKEN;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return false;
	}

	const token = authHeader.split(' ')[1];
	return token === expectedToken;
};
