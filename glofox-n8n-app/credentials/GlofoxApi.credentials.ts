import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Glofox (Social Fitness) credential.
 *
 * Rather than asking the user to enter Branch ID / API Key / API Token per gym
 * — which doesn't scale and is error-prone — this credential points the node at
 * a Google Sheet that already maps Studio Name → Branch ID + API Key + API Token.
 *
 * The user creates this credential once, then everywhere they use the Glofox
 * node they just pick a Studio from a dropdown populated from the sheet.
 *
 * Required fields:
 *   - sheetId:               the Google Sheets document ID
 *   - sheetTabName:          the tab/worksheet name (e.g. "Sheet1")
 *   - serviceAccountEmail:   service account that has Viewer access to the sheet
 *   - privateKey:            the PEM private key for that service account
 *
 * Expected sheet column headers (first row):
 *   Studio Name | Branch ID | API Key | API Token
 *
 * (Extra columns are allowed and ignored; the node looks up by header name.)
 */
export class GlofoxApi implements ICredentialType {
	name = 'glofoxApi';

	displayName = 'Glofox (Sheet-backed)';

	documentationUrl = 'https://github.com/SocialFitnessManchester/glofox-n8n-app';

	properties: INodeProperties[] = [
		{
			displayName: 'Studio Config Sheet ID',
			name: 'sheetId',
			type: 'string',
			default: '',
			required: true,
			description: 'The ID of the Google Sheet that maps studios to Glofox credentials. Take it from the URL of the sheet — the long string between /d/ and /edit.',
		},
		{
			displayName: 'Sheet Tab Name',
			name: 'sheetTabName',
			type: 'string',
			default: 'Sheet1',
			required: true,
			description: 'The name of the tab (worksheet) within the document. Must contain headers in row 1.',
		},
		{
			displayName: 'Service Account Email',
			name: 'serviceAccountEmail',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'name@project.iam.gserviceaccount.com',
			description: 'The Google Service Account email. Must have at least Viewer access to the Studio Config sheet.',
		},
		{
			displayName: 'Service Account Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
				rows: 5,
			},
			default: '',
			required: true,
			description: 'The PEM private key for the service account. Include the -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- markers. Literal \\n escape sequences are accepted and converted to real newlines.',
		},
	];
}
