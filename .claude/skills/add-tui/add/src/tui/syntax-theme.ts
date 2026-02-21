import chalk from 'chalk';

type HighlightTheme = Record<string, (text: string) => string>;

/**
 * Syntax highlighting theme for code blocks.
 * Uses chalk functions to style different token types.
 */
export function createSyntaxTheme(fallback: (text: string) => string): HighlightTheme {
  return {
    keyword: chalk.hex('#C586C0'),
    built_in: chalk.hex('#4EC9B0'),
    type: chalk.hex('#4EC9B0'),
    literal: chalk.hex('#569CD6'),
    number: chalk.hex('#B5CEA8'),
    string: chalk.hex('#CE9178'),
    regexp: chalk.hex('#D16969'),
    symbol: chalk.hex('#B5CEA8'),
    class: chalk.hex('#4EC9B0'),
    function: chalk.hex('#DCDCAA'),
    title: chalk.hex('#DCDCAA'),
    params: chalk.hex('#9CDCFE'),
    comment: chalk.hex('#6A9955'),
    doctag: chalk.hex('#608B4E'),
    meta: chalk.hex('#9CDCFE'),
    'meta-keyword': chalk.hex('#C586C0'),
    'meta-string': chalk.hex('#CE9178'),
    section: chalk.hex('#DCDCAA'),
    tag: chalk.hex('#569CD6'),
    name: chalk.hex('#9CDCFE'),
    attr: chalk.hex('#9CDCFE'),
    attribute: chalk.hex('#9CDCFE'),
    variable: chalk.hex('#9CDCFE'),
    bullet: chalk.hex('#D7BA7D'),
    code: chalk.hex('#CE9178'),
    emphasis: chalk.italic,
    strong: chalk.bold,
    formula: chalk.hex('#C586C0'),
    link: chalk.hex('#4EC9B0'),
    quote: chalk.hex('#6A9955'),
    addition: chalk.hex('#B5CEA8'),
    deletion: chalk.hex('#F44747'),
    'selector-tag': chalk.hex('#D7BA7D'),
    'selector-id': chalk.hex('#D7BA7D'),
    'selector-class': chalk.hex('#D7BA7D'),
    'selector-attr': chalk.hex('#D7BA7D'),
    'selector-pseudo': chalk.hex('#D7BA7D'),
    'template-tag': chalk.hex('#C586C0'),
    'template-variable': chalk.hex('#9CDCFE'),
    default: fallback,
  };
}
