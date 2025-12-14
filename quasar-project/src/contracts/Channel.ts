export interface Channel {
	id: number
	name: string
	public: boolean
	creatorId: number
	members: number[]
	banned?: number[]
	kickVotes?: Record<string, number[]>
}
