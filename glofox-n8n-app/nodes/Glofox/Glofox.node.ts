import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	fetchStudioRows,
	getStudioByName,
	glofoxRequest,
} from './helpers';

export class Glofox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Glofox: Lead, Purchase or Studio Config',
		name: 'glofox',
		icon: 'file:glofox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ ($parameter["resource"] === "lead" ? "New Lead" : $parameter["resource"] === "purchase" ? "New Purchase" : "Studio Config") + " @ " + $parameter["studio"] }}',
		description: 'Create a Lead, assign a Purchase, or output a studio\'s config (Glofox + GHL credentials), for the selected Glofox studio. Studio is picked from a Google-Sheet-backed dropdown.',
		defaults: { name: 'Glofox' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{ name: 'glofoxApi', required: true },
		],
		properties: [
			{
				displayName: 'Studio Name or ID',
				name: 'studio',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getStudios' },
				required: true,
				default: '',
				description: 'The Glofox studio to act against. Loaded from the studio config sheet on the credential. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Lead', value: 'lead' },
					{ name: 'Purchase', value: 'purchase' },
					{ name: 'Studio', value: 'studio' },
				],
				default: 'lead',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['lead'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new lead (contact) in the selected studio',
						action: 'Create a lead',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['purchase'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Assign a membership plan to an existing contact',
						action: 'Create a purchase',
					},
				],
				default: 'create',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['studio'] } },
				options: [
					{
						name: 'Get Config',
						value: 'getConfig',
						description: 'Output the selected studio\'s Glofox + GHL credentials from the config sheet',
						action: 'Get studio config',
					},
				],
				default: 'getConfig',
			},

			// ─── Lead.create fields ────────────────────────────────────────────
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@example.com',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				required: true,
				placeholder: '+447911123456',
				description: 'Include country code',
				displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
				options: [
					{
						displayName: 'Date of Birth',
						name: 'dateOfBirth',
						type: 'string',
						default: '',
						placeholder: '1990-01-15',
						description: 'Must be in YYYY-MM-DD format',
					},
					{
						displayName: 'Marketing Source Details',
						name: 'marketingSourceDetails',
						type: 'string',
						default: 'Social Fitness',
						description: 'Where the lead came from. Defaults to "Social Fitness".',
					},
					{
						displayName: 'Email Marketing Consent',
						name: 'consentEmail',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'SMS Marketing Consent',
						name: 'consentSms',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Push Notification Consent',
						name: 'consentPush',
						type: 'boolean',
						default: true,
					},
				],
			},

			// ─── Purchase.create fields ────────────────────────────────────────
			{
				displayName: 'Contact Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@example.com',
				default: '',
				required: true,
				description: 'Email of the existing Glofox contact to assign the membership to',
				displayOptions: { show: { resource: ['purchase'], operation: ['create'] } },
			},
			{
				displayName: 'Payment Method',
				name: 'paymentMethod',
				type: 'options',
				noDataExpression: true,
				default: 'cash',
				required: true,
				options: [
					{ name: 'Cash', value: 'cash' },
					{ name: 'Card', value: 'card' },
					{ name: 'Mandate', value: 'mandate' },
					{ name: 'Bank Transfer', value: 'bank_transfer' },
					{ name: 'Complimentary', value: 'complimentary' },
					{ name: 'Account Balance', value: 'account_balance' },
				],
				description: 'Card and mandate require the contact to have those payment details saved in Glofox.',
				displayOptions: { show: { resource: ['purchase'], operation: ['create'] } },
			},
			{
				displayName: 'Membership Name or ID',
				name: 'membershipId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getMemberships', loadOptionsDependsOn: ['studio'] },
				required: true,
				default: '',
				description: 'Loaded live from Glofox for the selected studio. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { resource: ['purchase'], operation: ['create'] } },
			},
			{
				displayName: 'Plan Name or ID',
				name: 'planCode',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPlans', loadOptionsDependsOn: ['studio', 'membershipId'] },
				required: true,
				default: '',
				description: 'Loaded live based on the selected Membership. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { resource: ['purchase'], operation: ['create'] } },
			},
		],
	};

	methods = {
		loadOptions: {
			async getStudios(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchStudioRows(this);
				return rows
					.map((r) => ({ name: r.studioName, value: r.studioName }))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getMemberships(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const studio = this.getNodeParameter('studio', '') as string;
				if (!studio) return [];
				const row = await getStudioByName(this, studio);
				const resp = await glofoxRequest(this, row, 'GET', '/2.0/memberships', undefined, { private: 'any' });
				const memberships: IDataObject[] = (resp.data as IDataObject[]) ?? (resp as unknown as IDataObject[]) ?? [];
				return memberships
					.filter((m) => (m._id || m.id) && m.name)
					.map((m) => ({
						name: m.name as string,
						value: (m._id ?? m.id) as string,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getPlans(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const studio = this.getNodeParameter('studio', '') as string;
				const membershipId = this.getNodeParameter('membershipId', '') as string;
				if (!studio || !membershipId) return [];

				const row = await getStudioByName(this, studio);
				const resp = await glofoxRequest(this, row, 'GET', '/2.0/memberships', undefined, { private: 'any' });
				const memberships: IDataObject[] = (resp.data as IDataObject[]) ?? (resp as unknown as IDataObject[]) ?? [];
				const membership = memberships.find((m) => (m._id ?? m.id) === membershipId);
				if (!membership) return [];

				const plans: IDataObject[] = (membership.plans as IDataObject[]) ?? [];
				return plans
					.filter((p) => p.name)
					.map((p) => ({
						name: p.name as string,
						value: String(p.code ?? p._id ?? p.id),
					}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const studio = this.getNodeParameter('studio', i) as string;
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const row = await getStudioByName(this, studio);

				if (resource === 'lead' && operation === 'create') {
					const firstName = this.getNodeParameter('firstName', i) as string;
					const lastName = this.getNodeParameter('lastName', i) as string;
					const email = this.getNodeParameter('email', i) as string;
					const phone = this.getNodeParameter('phone', i) as string;
					const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						first_name: firstName,
						last_name: lastName,
						email,
						phone,
						type: 'MEMBER',
						lead_status: 'LEAD',
						leads: {
							marketing_source: 'Other',
							marketing_source_details: (additional.marketingSourceDetails as string) || 'Social Fitness',
						},
						consent: {
							email: { active: additional.consentEmail !== false },
							sms: { active: additional.consentSms !== false },
							push: { active: additional.consentPush !== false },
						},
					};
					if (additional.dateOfBirth) body.birth = additional.dateOfBirth;

					const result = await glofoxRequest(
						this,
						row,
						'POST',
						`/2.1/branches/${row.branchId}/leads`,
						body,
					);
					returnData.push({ json: result, pairedItem: { item: i } });
					continue;
				}

				if (resource === 'purchase' && operation === 'create') {
					const email = this.getNodeParameter('email', i) as string;
					const paymentMethod = this.getNodeParameter('paymentMethod', i) as string;
					const membershipId = this.getNodeParameter('membershipId', i) as string;
					const planCode = this.getNodeParameter('planCode', i) as string;

					// 1. Resolve user_id by email
					const memberLookup = await glofoxRequest(
						this,
						row,
						'GET',
						'/2.0/members',
						undefined,
						{ email },
					);
					const members: IDataObject[] = (memberLookup.data as IDataObject[]) ?? (memberLookup as unknown as IDataObject[]) ?? [];
					if (!members.length) {
						throw new NodeOperationError(
							this.getNode(),
							`No Glofox contact found with email "${email}" in studio "${studio}". Create the lead first.`,
						);
					}
					const userId = String(members[0]._id ?? members[0].id);

					// 2. POST the purchase
					const purchasePath = `/2.2/branches/${row.branchId}/users/${userId}/memberships/${membershipId}/plans/${encodeURIComponent(planCode)}/purchase`;
					const result = await glofoxRequest(
						this,
						row,
						'POST',
						purchasePath,
						{ payment_method: paymentMethod },
					);
					returnData.push({
						json: { ...result, user_id: userId, membership_id: membershipId, plan_code: planCode },
						pairedItem: { item: i },
					});
					continue;
				}

				if (resource === 'studio' && operation === 'getConfig') {
					returnData.push({
						json: {
							studio_name: row.studioName,
							branch_id: row.branchId,
							api_key: row.apiKey,
							api_token: row.apiToken,
							ghl_location: row.ghlLocation,
							ghl_pit: row.ghlPit,
						},
						pairedItem: { item: i },
					});
					continue;
				}

				throw new NodeOperationError(
					this.getNode(),
					`Unsupported resource/operation combination: ${resource}/${operation}`,
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
