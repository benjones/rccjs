import { parser } from '$lib/assembly/sc-assembly';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { SC_Assembly_Highlighting } from '$lib/assembly/Assembly-Highlights';
import { completeFromList } from '@codemirror/autocomplete';

let parserWithMetadata = parser.configure({
	props: [SC_Assembly_Highlighting]
});

const SC_Assembly_Language = LRLanguage.define({
	parser: parserWithMetadata,
	languageData: {
		commentTokens: { line: '//' }
	}
});

const SC_Assembly_Completion = SC_Assembly_Language.data.of({
	autocomplete: completeFromList([
		'load',
		'store',
		'jump',
		'bgt',
		'bne',
		'cmp',
		'add',
		'sub',
		'and',
		'nor',
		'not',
		'halt',
		'r0',
		'r1'
	])
});

export function SC_Assembly() {
	return new LanguageSupport(SC_Assembly_Language, [SC_Assembly_Completion]);
}
