const messages = {
	Added: 'Added',
	Apply: 'Apply',
	Attended: 'Attended',
	Cancelled: 'Cancelled',
	ChooseDate: 'Choose date',
	Clear: 'Clear',
	Diagnosed: 'Diagnosed',
	Discontinued: 'Discontinued',
	Executed: 'Executed',
	Issued: 'Issued',
	LastUpdated: 'Last Updated',
	NextMonth: 'Next month',
	NextYear: 'Next year',
	NextYears: 'Next years',
	Prescribed: 'Prescribed',
	PreviousMonth: 'Previous month',
	PreviousYear: 'Previous year',
	PreviousYears: 'Previous years',
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
