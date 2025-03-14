import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('SC Compiler Page', () => {

	test('Render Code Editor', () => {
		render(Page);

		const element = screen.getAllByRole("textbox")[0];

		expect(element).toHaveClass("cm-content");
		expect(element).not.toHaveClass("cm-lineWrapping");
	});

	test('Render Machine Code Output', () => {
		render(Page);

		const element = screen.getAllByRole("textbox")[1];

		expect(element).toHaveClass("cm-content");
		expect(element).toHaveClass("cm-lineWrapping");
	});
});
