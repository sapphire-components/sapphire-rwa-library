const messages = {
	Added: 'Added',
	Attended: 'Attended',
	Cancelled: 'Cancelled',
	Diagnosed: 'Diagnosed',
	Discontinued: 'Discontinued',
	Executed: 'Executed',
	Issued: 'Issued',
	LastUpdated: 'Last Updated',
	Prescribed: 'Prescribed',
	Recorded: 'Recorded',
	Registered: 'Registered',
	Requested: 'Requested',
	Scheduled: 'Scheduled',
	at: 'at',
	by: 'by',
	from: 'from',
	in: 'in',
	on: 'on',
	onBehalfOf: 'on behalf of',
} as const;

export type MessageKey = keyof typeof messages;

export default messages;
