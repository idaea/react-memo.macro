import React from "react";
import { memo } from "../../helpers/react-memo.macro";

function TodoApp() {
	memo();

	return (
		<div>
			<TodoItem />
			<TodoItem />
		</div>
	);
}

function someFiller() {
	// should not be converted
	return 123;
}

function TodoItem() {
	memo();
	return <p>Sample text</p>;
}
