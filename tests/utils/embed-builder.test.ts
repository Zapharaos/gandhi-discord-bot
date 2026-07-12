import {EmbedBuilderUtils} from "@utils/embed-builder";

describe('EmbedBuilderUtils', () => {
    describe('buildFields', () => {
        it('joins the titles with a dash for the field name', () => {
            const field = EmbedBuilderUtils.buildFields([['a', 'b']], ['Left', 'Right']);
            expect(field.name).toBe('Left - Right');
        });

        it('wraps the content in a code block and is not inline', () => {
            const field = EmbedBuilderUtils.buildFields([['a', 'b']], ['Left', 'Right']);
            expect(field.value.startsWith('```')).toBe(true);
            expect(field.value.endsWith('```')).toBe(true);
            expect(field.inline).toBe(false);
        });

        it('pads the first column to align rows', () => {
            const field = EmbedBuilderUtils.buildFields([['a', 'x'], ['bbb', 'y']], ['C1', 'C2']);
            // 'a' is padded to the width of 'bbb' (3 chars) before the separator.
            expect(field.value).toContain('a  \t| x');
            expect(field.value).toContain('bbb\t| y');
        });
    });
});
