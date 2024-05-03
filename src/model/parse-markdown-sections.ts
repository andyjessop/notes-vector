interface Section {
	heading: string;
	level: number;
	path: string;
	content: string;
}

export function parseMarkdownSections(
	markdown: string,
	minViableContentLength = 15,
): Section[] {
	const lines = markdown.split("\n");
	const sections: Section[] = [];
	const pathStack: string[] = [];
	let currentSection: Section | null = null;

	for (const line of lines) {
		const match = line.match(/^(#+)\s*(.*)/);
		if (match) {
			const [, levelStr, heading] = match;
			const level = levelStr.length;

			if (currentSection && currentSection.content.trim() !== "") {
				if (
					currentSection.content.length >
					heading.length + minViableContentLength
				) {
					sections.push(currentSection);
				}
			}

			while (pathStack.length >= level) {
				pathStack.pop();
			}

			pathStack.push(heading);

			currentSection = {
				heading,
				level,
				path: pathStack.join("/"),
				content: `${line}\n`,
			};
		} else if (currentSection) {
			currentSection.content += `${line}\n`;
		}
	}

	if (currentSection && currentSection.content.trim() !== "") {
		sections.push(currentSection);
	}

	return sections;
}

export function buildSectionContent(section: Section): string {
	return `
    Parents: ${section.path}
    Content: ${section.content}
    `;
}
