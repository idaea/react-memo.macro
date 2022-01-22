import * as path from "node:path";
import * as fs from "node:fs";

import plugin from "babel-plugin-macros";
import pluginTester, { TestObject } from "babel-plugin-tester";

pluginTester({
	plugin,
	pluginName: require("../package.json").name,
	pluginOptions: {
		"react-memo.macro": {
			addDisplayNames: true,
		},
	},
	filename: __filename,
	tests: findTests(),
	babelOptions: require("./babel.config.transforms.js"),
});

function findTests(): TestObject[] {
	const fixturesDir = path.join(__dirname, "fixtures");
	const fixtureSubDirs = fs.readdirSync(fixturesDir);

	return fixtureSubDirs.flatMap((subDirName) => {
		function fp(fn: string): string {
			return path.join(fixturesDir, subDirName, fn);
		}

		const hasOutputFile = fs.existsSync(fp("output.js"));

		const testConfig = fileOrDefault<TestObject>(fp("test.json"), {});

		const test = {
			title: subDirName,
			fixture: fp("code.js"),
			outputFixture: hasOutputFile ? fp("output.js") : undefined,
			snapshot: !testConfig.error && !hasOutputFile,

			error: testConfig.error,
			babelOptions: testConfig.babelOptions,
		};

		return [
			{
				...test,
				title: `${test.title}-display-names`,
				pluginOptions: {
					"react-memo.macro": {
						addDisplayNames: true,
					},
				},
			},
			{
				...test,
				title: `${test.title}-no-display-names`,
				pluginOptions: {
					"react-memo.macro": {
						addDisplayNames: false,
					},
				},
			},
		];
	});
}

function fileOrDefault<T>(filepath: string, defaultValue: T): T {
	if (fs.existsSync(filepath)) {
		return require(filepath) as T;
	}

	return defaultValue;
}
