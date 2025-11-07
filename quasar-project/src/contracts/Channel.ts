export interface Channel {
	id: number
	name: string
	public: boolean
	creatorId: number
	members: number[]
	// Legacy local-demo fields kept optional
	banned?: number[]
	kickVotes?: Record<string, number[]>
}
