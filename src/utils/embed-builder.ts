import {EmbedField} from "discord.js";

export class EmbedBuilderUtils {
    static buildFields(rows: string[][], titles: string[]): EmbedField {
        const lengths: number[] = [];

        // Calculate the max length for each column
        rows.forEach(row => {
            row.forEach((column, index) => {
                lengths[index] = Math.max(lengths[index] ?? 0, column.length);
            });
        });

        const content: string[] = rows.map(row => {
            let content = '';
            row.forEach((column, index) => {
                // First column : basic line
                if (index === 0) {
                    content += column.padEnd(lengths[index], ' ');
                    return;
                }

                const base = '\t| ';

                // Last column : no padding
                if (index === row.length - 1) {
                    content += base + column;
                    return;
                }

                content += base + column.padEnd(lengths[index], ' ');
            })
            return content;
        });

        return {
            name: titles.join(' - '),
            value: `\`\`\`${content.join("\n")}\`\`\``, // Wrap in code block
            inline: false
        };
    }
}