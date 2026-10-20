/** What the main step hands the post step. */
export const State = {
	/** The CLI's store path; set only when the job pushes. */
	Cli: "cli",
	/** A file listing the store's paths before the job. */
	StorePaths: "storePaths",
} as const;
