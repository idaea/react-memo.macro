import { createMacro } from "babel-plugin-macros";
import type { MacroHandler } from "babel-plugin-macros";
import { CallExpression, FunctionDeclaration, Node } from "@babel/types";
import { NodePath, types } from "@babel/core";

const memoMacro: MacroHandler = function memo({
	references,
	babel: { types: t },
	config,
}) {
	for (const macroReference of references["memo"]) {
		const containingBlockOfMacro =
			tryParentPath(macroReference, [
				"ExpressionStatement",
				"BlockStatement",
			])?.parentPath ?? throwInvalidUsage();

		const componentDefinition = getComponentDefinition(
			containingBlockOfMacro
		);

		const context = getDeclarationDetails(containingBlockOfMacro);

		const declarationName = context.assignedName ?? componentDefinition.name;
		const componentName = componentDefinition.name ?? context.assignedName;

		const newComponentDeclaration = generateReactMemoCall(
			componentName,
			componentDefinition.params,
			componentDefinition.body,
			config?.addDisplayNames ?? false,
			t
		);

		context.rootPath.replaceWith(
			(() => {
				if (
					(context.type === "exported" || context.type === "declare") &&
					declarationName
				) {
					return generateConstDeclaration(
						declarationName,
						newComponentDeclaration,
						context.type === "exported",
						t
					);
				}

				if (context.type === "exported") {
					return t.exportDefaultDeclaration(newComponentDeclaration);
				}

				return newComponentDeclaration;
			})()
		);

		macroReference.parentPath?.remove();
	}
};

interface ComponentDefinition {
	/** The name, if contained in the declaration */
	readonly name?: string;

	readonly body: types.BlockStatement;

	readonly params: FunctionDeclaration["params"];
}

function getComponentDefinition(path: NodePath<Node>): ComponentDefinition {
	if (path.isFunctionDeclaration()) {
		return {
			name: path.node.id?.name ?? undefined,
			body: path.node.body,
			params: path.node.params,
		};
	} else if (path.isArrowFunctionExpression()) {
		if (path.node.body.type !== "BlockStatement") {
			return throwInvalidUsage();
		}

		return {
			name: undefined,
			body: path.node.body,
			params: path.node.params,
		};
	} else if (path.isFunctionExpression()) {
		return {
			name: path.node.id?.name ?? undefined,
			body: path.node.body,
			params: path.node.params,
		};
	}

	return throwInvalidUsage();
}

interface Declaration {
	/** The node we ultimately need to replace */
	readonly rootPath: NodePath<Node>;

	/** The name the outer context assigns - e.g. `const Foo = ...` */
	readonly assignedName?: string;

	readonly type: "exported" | "declare" | "misc";
}

function getDeclarationDetails(
	componentFunctionNode: NodePath<Node>
): Declaration {
	if (componentFunctionNode.parentPath?.isExportDefaultDeclaration()) {
		return { rootPath: componentFunctionNode.parentPath!, type: "exported" };
	}

	if (componentFunctionNode.parentPath?.isVariableDeclarator()) {
		if (componentFunctionNode.parentPath.node.id.type !== "Identifier") {
			throwInvalidUsage();
		}

		const name = componentFunctionNode.parentPath.node.id.name;

		if (
			!componentFunctionNode.parentPath.parentPath.isVariableDeclaration()
		) {
			throwInvalidUsage();
		}

		return {
			...getDeclarationDetails(componentFunctionNode.parentPath.parentPath),
			assignedName: name,
		};
	}

	if (componentFunctionNode.parentPath?.isExportNamedDeclaration()) {
		return {
			rootPath: componentFunctionNode.parentPath,
			type: "exported",
		};
	} else if (
		componentFunctionNode.parentPath?.isProgram() ||
		componentFunctionNode.parentPath?.isBlockStatement()
	) {
		return {
			rootPath: componentFunctionNode,
			type: "declare",
		};
	} else {
		return {
			rootPath: componentFunctionNode,
			type: "misc",
		};
	}
}

function throwInvalidUsage(): never {
	throw new Error("Macro used in unsupported context");
}

function generateConstDeclaration(
	componentName: string,
	value: types.Expression,
	shouldExport: boolean,
	t: typeof types
): Node {
	const declaration = t.variableDeclaration("const", [
		t.variableDeclarator(t.identifier(componentName), value),
	]);

	return shouldExport ? t.exportNamedDeclaration(declaration) : declaration;
}

function generateReactMemoCall(
	componentName: string | undefined,
	params: FunctionDeclaration["params"],
	body: types.BlockStatement,
	shouldAddDisplayName: boolean,
	t: typeof types
): CallExpression {
	return t.callExpression(
		t.memberExpression(t.identifier("React"), t.identifier("memo")),
		[
			shouldAddDisplayName && componentName
				? t.callExpression(
						t.arrowFunctionExpression(
							[],
							t.blockStatement([
								t.functionDeclaration(
									t.identifier(componentName),
									params,
									body
								),
								t.expressionStatement(
									t.assignmentExpression(
										"=",
										t.memberExpression(
											t.identifier(componentName),
											t.identifier("displayName")
										),
										t.stringLiteral(componentName)
									)
								),
								t.returnStatement(t.identifier(componentName)),
							])
						),
						[]
				  )
				: componentName
				? t.functionExpression(t.identifier(componentName), params, body)
				: t.arrowFunctionExpression(params, body),
		]
	);
}

function tryParentPath<TNode extends Node>(
	startingPoint: NodePath<Node>,
	path: Array<NodePath<Node>["type"]>
): NodePath<TNode> | undefined {
	let currentNode = startingPoint.parentPath;

	for (const pathElement of path) {
		if (!currentNode) {
			return undefined;
		}

		currentNode = currentNode.parentPath;
		if (currentNode?.type !== pathElement) {
			return undefined;
		}
	}

	return (currentNode as NodePath<TNode>) ?? undefined;
}

export default createMacro(memoMacro, {
	configName: "react-memo.macro",
});
