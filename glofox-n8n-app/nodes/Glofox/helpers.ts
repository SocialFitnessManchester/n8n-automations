import { JWT } from 'google-auth-library';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';

export const GLOFOX_BASE_URL = 'https://gf-api.aws.glofox.com/prod';

export interface StudioRow {
	studioName: string;
	branchId: string;
	apiKey: string;
	apiToken: string;
	ghlLocation: string;
	ghlPit: string;
}

/**
 * Headers Glofox requires for all branch-scoped API calls.
 */
export function glofoxHeaders(row: StudioRow): IDataObject {
	return {
		'Content-Type': 'application/json',
		'x-glofox-branch-id': row.branchId,
		'x-api-key': row.apiKey,
		'x-glofox-api-token': row.apiToken,
	};
}

/**
 * Normalize a PEM private key that may contain literal "\n" escape sequences
 * (common when the key is pasted directly from a JSON service-account file).
 */
function normalizePrivateKey(key: string): string {
	return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

/**
 * Read every row from the studio config Google Sheet using the credential's
 * service-account JWT. Returns one StudioRow per row that has a usable
 * Branch ID, API Key, and API Token.
 */
export async function fetchStudioRows(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<StudioRow[]> {
	const cred = await ctx.getCredentials('glofoxApi');
	const sheetId = (cred.sheetId as string).trim();
	const tabName = (cred.sheetTabName as string).trim() || 'Sheet1';
	const email = (cred.serviceAccountEmail as string).trim();
	const privateKey = normalizePrivateKey(cred.privateKey as string);

	const jwt = new JWT({
		email,
		key: privateKey,
		scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
	});

	let accessToken: string | null | undefined;
	try {
		const tokenResp = await jwt.getAccessToken();
		accessToken = tokenResp.token;
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Failed to authenticate to Google Sheets with the supplied service account: ${(error as Error).message}`,
		);
	}

	if (!accessToken) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Google did not return an access token for the supplied service account.',
		);
	}

	const range = encodeURIComponent(`${tabName}!A:Z`);
	const sheetsResp = await ctx.helpers.httpRequest({
		method: 'GET' as IHttpRequestMethods,
		url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
		headers: { Authorization: `Bearer ${accessToken}` },
		json: true,
	});

	const values: string[][] = (sheetsResp as { values?: string[][] }).values ?? [];
	if (values.length < 2) return [];

	const headers = values[0].map((h) => (h ?? '').trim());
	const idx = (name: string) =>
		headers.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase()));

	const studioCol = idx('Studio Name');
	const branchCol = idx('Branch ID');
	const apiKeyCol = idx('API Key');
	const apiTokenCol = idx('API Token');

	if (studioCol < 0 || branchCol < 0 || apiKeyCol < 0 || apiTokenCol < 0) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Studio config sheet is missing required headers. Expected: "Studio Name", "Branch ID", "API Key", "API Token". Got: ${headers.join(', ')}`,
		);
	}

	const rows: StudioRow[] = [];
	for (let i = 1; i < values.length; i++) {
		const row = values[i];
		const studioName = (row[studioCol] ?? '').trim();
		const branchId = (row[branchCol] ?? '').trim();
		const apiKey = (row[apiKeyCol] ?? '').trim();
		const apiToken = (row[apiTokenCol] ?? '').trim();
		// GHL Location / PIT are read BY POSITION (columns 4 and 5), per the
		// canonical sheet layout: Studio | Branch | API Key | API Token | GHL Location | GHL PIT.
		// They are optional — not every row has them filled in yet.
		const ghlLocation = (row[4] ?? '').trim();
		const ghlPit = (row[5] ?? '').trim();
		if (!studioName || !branchId || !apiKey || !apiToken) continue;
		rows.push({ studioName, branchId, apiKey, apiToken, ghlLocation, ghlPit });
	}
	return rows;
}

/**
 * Pull a single studio row by its Studio Name (the dropdown value).
 * Throws a clear error if the name doesn't match any row.
 */
export async function getStudioByName(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
	studioName: string,
): Promise<StudioRow> {
	const rows = await fetchStudioRows(ctx);
	const match = rows.find((r) => r.studioName === studioName);
	if (!match) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Studio "${studioName}" was not found in the studio config sheet. Check the sheet has a row whose Studio Name matches exactly.`,
		);
	}
	return match;
}

/**
 * Wrapper around helpers.httpRequest that adds Glofox headers and handles
 * non-2xx responses by throwing a NodeApiError so the workflow stops cleanly.
 */
export async function glofoxRequest(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
	row: StudioRow,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	try {
		const response = await ctx.helpers.httpRequest({
			method,
			url: `${GLOFOX_BASE_URL}${path}`,
			headers: glofoxHeaders(row),
			body,
			qs,
			json: true,
		});
		return response as IDataObject;
	} catch (error) {
		throw new NodeApiError(ctx.getNode(), error as JsonObject);
	}
}
